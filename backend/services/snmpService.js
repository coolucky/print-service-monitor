const snmp = require('net-snmp');

class SnmpService {
  constructor() {
    this.timeout = 5000; // 5秒超时
  }

  /**
   * Get printer toner levels via SNMP
   * Uses RFC 3805 Printer MIB:
   *   OID .8 = prtMarkerSuppliesMaxCapacity (max capacity)
   *   OID .9 = prtMarkerSuppliesLevel (current remaining level)
   * Formula: percentage = (currentLevel / maxCapacity) * 100
   * @param {string} ip - Printer IP address
   * @param {string} community - SNMP community string (default: public)
   * @returns {Promise<object>} Toner levels
   */
  async getTonerLevels(ip, community = 'public') {
    return new Promise((resolve, reject) => {
      const session = snmp.createSession(ip, community, {
        port: 161,
        timeout: this.timeout,
        retries: 2
      });

      // RFC 3805 Printer MIB OIDs:
      // 1.3.6.1.2.1.43.11.1.1.8 = prtMarkerSuppliesMaxCapacity
      // 1.3.6.1.2.1.43.11.1.1.9 = prtMarkerSuppliesLevel (current remaining)
      const tonerOids = {
        blackMax: '1.3.6.1.2.1.43.11.1.1.8.1.1',
        cyanMax: '1.3.6.1.2.1.43.11.1.1.8.1.2',
        magentaMax: '1.3.6.1.2.1.43.11.1.1.8.1.3',
        yellowMax: '1.3.6.1.2.1.43.11.1.1.8.1.4',
        blackLevel: '1.3.6.1.2.1.43.11.1.1.9.1.1',
        cyanLevel: '1.3.6.1.2.1.43.11.1.1.9.1.2',
        magentaLevel: '1.3.6.1.2.1.43.11.1.1.9.1.3',
        yellowLevel: '1.3.6.1.2.1.43.11.1.1.9.1.4'
      };

      const oids = Object.values(tonerOids);

      session.get(oids, (error, varbinds) => {
        if (error) {
          console.error(`SNMP error for ${ip}:`, error);
          session.close();
          reject(new Error(`SNMP error: ${error.message}`));
          return;
        }

        const tonerValues = {};

        varbinds.forEach((varbind, index) => {
          if (snmp.isVarbindError(varbind)) {
            console.error(`SNMP varbind error for ${ip}:`, snmp.varbindError(varbind));
          } else {
            const key = Object.keys(tonerOids)[index];
            let value;
            if (typeof varbind.value === 'number') {
              value = varbind.value;
            } else if (varbind.value && typeof varbind.value === 'object' && varbind.value.toString) {
              value = parseInt(varbind.value.toString());
            } else if (typeof varbind.value === 'string') {
              value = parseInt(varbind.value, 10);
            } else {
              value = null;
            }
            if (value !== null && !isNaN(value) && value > 0) {
              tonerValues[key] = value;
            }
          }
        });

        session.close();

        // Calculate toner percentages: level / maxCapacity * 100
        const tonerLevels = {};
        const colors = ['black', 'cyan', 'magenta', 'yellow'];

        colors.forEach(color => {
          const maxKey = `${color}Max`;
          const levelKey = `${color}Level`;

          if (tonerValues[maxKey] && tonerValues[levelKey] !== undefined) {
            const max = tonerValues[maxKey];
            const level = tonerValues[levelKey];
            const percentage = Math.round((level / max) * 100);
            tonerLevels[color] = Math.min(100, Math.max(0, percentage));
            console.log(`Toner ${color} on ${ip}: ${tonerLevels[color]}% (level=${level}, max=${max})`);
          }
        });

        if (Object.keys(tonerLevels).length > 0) {
          resolve(tonerLevels);
        } else {
          console.log(`No valid toner data from standard OIDs for ${ip}, trying vendor OIDs...`);
          this.getTonerLevelsWithVendorOids(ip, community)
            .then(resolve)
            .catch(() => resolve(null));
        }
      });

      session.on('error', (error) => {
        console.error(`SNMP session error for ${ip}:`, error);
        session.close();
        resolve(null);
      });
    });
  }

  /**
   * Fallback: Get toner levels using SNMP subtree walk
   * Used when direct OID access fails (different index numbering)
   * @param {string} ip - Printer IP address
   * @param {string} community - SNMP community string
   * @returns {Promise<object>} Toner levels
   */
  async getTonerLevelsWithVendorOids(ip, community) {
    return new Promise((resolve, reject) => {
      const session = snmp.createSession(ip, community, {
        port: 161,
        timeout: this.timeout,
        retries: 1
      });

      // Walk the supplies subtree to find all max capacities and levels
      const maxCapacityBase = '1.3.6.1.2.1.43.11.1.1.8';
      const currentLevelBase = '1.3.6.1.2.1.43.11.1.1.9';
      const descriptionBase = '1.3.6.1.2.1.43.11.1.1.6';

      const maxValues = {};
      const levelValues = {};
      const descriptions = {};

      // Walk max capacity subtree
      session.subtree(maxCapacityBase, (varbinds) => {
        varbinds.forEach(varbind => {
          if (!snmp.isVarbindError(varbind)) {
            const oid = varbind.oid.toString();
            const index = oid.split('.').pop();
            const value = typeof varbind.value === 'number' ? varbind.value : parseInt(varbind.value.toString());
            if (!isNaN(value) && value > 0) {
              maxValues[index] = value;
            }
          }
        });
      }, (error) => {
        if (error && error.message !== 'OID not increasing') {
          console.error(`Subtree walk (max) failed for ${ip}:`, error.message);
        }

        // Walk current level subtree
        session.subtree(currentLevelBase, (varbinds) => {
          varbinds.forEach(varbind => {
            if (!snmp.isVarbindError(varbind)) {
              const oid = varbind.oid.toString();
              const index = oid.split('.').pop();
              const value = typeof varbind.value === 'number' ? varbind.value : parseInt(varbind.value.toString());
              if (!isNaN(value)) {
                levelValues[index] = value;
              }
            }
          });
        }, (error2) => {
          if (error2 && error2.message !== 'OID not increasing') {
            console.error(`Subtree walk (level) failed for ${ip}:`, error2.message);
          }

          session.close();

          // Match max and level values by index
          const tonerLevels = {};
          const colorOrder = ['black', 'cyan', 'magenta', 'yellow'];
          const indices = Object.keys(maxValues).sort((a, b) => parseInt(a) - parseInt(b));

          indices.forEach((idx, i) => {
            if (i < colorOrder.length && levelValues[idx] !== undefined && maxValues[idx]) {
              const color = colorOrder[i];
              const percentage = Math.round((levelValues[idx] / maxValues[idx]) * 100);
              tonerLevels[color] = Math.min(100, Math.max(0, percentage));
              console.log(`Toner (walk) ${color} on ${ip}: ${tonerLevels[color]}% (level=${levelValues[idx]}, max=${maxValues[idx]})`);
            }
          });

          if (Object.keys(tonerLevels).length > 0) {
            resolve(tonerLevels);
          } else {
            resolve(null);
          }
        });
      });

      session.on('error', (error) => {
        console.error(`SNMP session error for ${ip}:`, error);
        session.close();
        resolve(null);
      });
    });
  }

  /**
   * Normalize toner level to 0-100%
   * @param {number|object} value - SNMP value
   * @returns {number|null} Normalized toner level or null if cannot be normalized
   */
  normalizeTonerLevel(value) {
    // 处理不同类型的返回值
    let level;
    
    if (typeof value === 'number') {
      level = value;
    } else if (value && typeof value === 'object' && value.toString) {
      level = parseInt(value.toString());
    } else if (typeof value === 'string') {
      level = parseInt(value, 10);
    } else {
      // 无法解析值，返回失败
      return null;
    }

    if (isNaN(level)) {
      return null;
    }

    // 有些设备返回0-100的百分比
    if (level <= 100 && level >= 0) {
      return level;
    } else if (level > 100) {
      // 检查是否可能是基于不同最大值的原始值
      // 常见的墨粉容量范围：10000-20000
      if (level <= 20000) {
        // 尝试两种计算方式，选择更合理的结果
        const maxCapacity = 15000;
        const percentage1 = Math.round((level / maxCapacity) * 100); // 假设是剩余量
        const percentage2 = Math.round((1 - level / maxCapacity) * 100); // 假设是已使用量
        
        // 根据用户提供的实际数据，选择更接近的计算方式
        // 对于10.128.20.6，黄色墨粉原始值13650，实际约45%
        // 计算方式1: (13650/15000)*100=91%，计算方式2: (1-13650/15000)*100=9%
        // 青色墨粉原始值9450，实际约65%
        // 计算方式1: (9450/15000)*100=63%，计算方式2: (1-9450/15000)*100=38%
        // 看起来计算方式1更接近青色，但与黄色不符
        // 可能不同颜色的计算方式不同，或者最大值不同
        // 暂时使用计算方式1，但添加日志以便进一步分析
        console.log(`Calculating toner level: raw=${level}, max=${maxCapacity}, method1=${percentage1}%, method2=${percentage2}%`);
        return Math.min(100, Math.max(0, percentage1));
      } else if (level <= 65535) {
        // 对于更大的值，使用65535作为最大值
        return Math.round((level / 65535) * 100);
      } else {
        // 无法确定合理范围，返回失败
        return null;
      }
    }
    // 无法解析值，返回失败
    return null;
  }

  /**
   * Test SNMP connectivity to a printer
   * @param {string} ip - Printer IP address
   * @param {string} community - SNMP community string
   * @returns {Promise<boolean>} True if SNMP is accessible
   */
  async testSnmpConnectivity(ip, community = 'public') {
    return new Promise((resolve) => {
      const session = snmp.createSession(ip, community, {
        port: 161,
        timeout: 3000,
        retries: 1
      });

      // 尝试获取系统描述符
      const sysDescrOid = '1.3.6.1.2.1.1.1.0';

      session.get([sysDescrOid], (error, varbinds) => {
        session.close();
        if (error || varbinds.some(snmp.isVarbindError)) {
          resolve(false);
        } else {
          resolve(true);
        }
      });

      session.on('error', () => {
        session.close();
        resolve(false);
      });
    });
  }
}

module.exports = new SnmpService();