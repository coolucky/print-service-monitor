/**
 * 设置路由模块
 * 负责系统设置的获取和保存
 */
const express = require('express');
const router = express.Router();
const settingsService = require('../services/settingsService');
const EmailServiceClass = require('../services/emailService');

let emailService = null;

/**
 * 初始化设置模块
 * @param {Object} initialSettings - 初始设置
 */
function initSettings(initialSettings) {
  // 创建邮件服务
  if (initialSettings && initialSettings.email) {
    const emailConfig = {
      host: initialSettings.email.smtpServer,
      port: initialSettings.email.smtpPort,
      secure: initialSettings.email.useTls,
      user: initialSettings.email.smtpUser,
      pass: initialSettings.email.smtpPass
    };
    emailService = new EmailServiceClass(emailConfig);
  } else {
    emailService = new EmailServiceClass();
  }
}

/**
 * GET / - 获取系统设置
 */
router.get('/', (req, res) => {
  try {
    const settings = settingsService.getSettings();
    res.apiSuccess(settings, 'Settings fetched successfully');
  } catch (error) {
    console.error('Error getting settings:', error.message);
    res.apiError('Failed to get settings', 500, error.message);
  }
});

/**
 * POST / - 保存系统设置
 */
router.post('/', (req, res) => {
  try {
    const settings = settingsService.saveSettings(req.body);
    
    // 重新初始化邮件服务
    initSettings(settings);
    
    res.apiSuccess(settings, 'Settings saved successfully');
  } catch (error) {
    console.error('Error saving settings:', error.message);
    res.apiError('Failed to save settings', 500, error.message);
  }
});

/**
 * GET /settings/email-test - 测试邮件配置
 */
router.get('/settings/email-test', async (req, res) => {
  try {
    const { to, from } = req.query;
    
    if (!to) {
      return res.apiError('Recipient email is required', 400);
    }
    
    if (!emailService) {
      return res.apiError('Email service not initialized', 500);
    }
    
    const fromEmail = from || process.env.DEFAULT_FROM_EMAIL || 'printer-report@example.com';
    
    console.log(`Testing email configuration to: ${to}, from: ${fromEmail}`);
    
    // 发送测试邮件
    const result = await emailService.sendTestEmail(to, fromEmail);
    
    res.apiSuccess(result, 'Test email sent successfully');
  } catch (error) {
    console.error('Error testing email:', error);
    res.apiError('Failed to send test email', 500, error.message);
  }
});

/**
 * GET /settings/validate - 验证设置
 */
router.get('/settings/validate', (req, res) => {
  try {
    const settings = settingsService.getSettings();
    const validation = {
      email: {
        configured: !!(settings.email && settings.email.smtpServer),
        hasServer: !!settings.email?.smtpServer,
        hasPort: !!settings.email?.smtpPort
      },
      papercut: {
        configured: !!(settings.papercut && settings.papercut.host),
        hasHost: !!settings.papercut?.host,
        hasPort: !!settings.papercut?.port
      },
      application: {
        configured: !!settings.application
      }
    };
    
    res.apiSuccess(validation, 'Settings validation result');
  } catch (error) {
    console.error('Error validating settings:', error.message);
    res.apiError('Failed to validate settings', 500, error.message);
  }
});

module.exports = {
  router,
  initSettings,
  getEmailService: () => emailService
};
