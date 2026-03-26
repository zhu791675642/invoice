/**
 * 环境配置文件
 * lib/env.js
 * 
 * 说明：
 * 1. 从腾讯云微搭后台获取环境 ID 和应用 ID
 * 2. TextIn API 密钥已配置，但建议在云函数中使用环境变量
 */

const envConfig = {
  // ===== 腾讯云微搭配置 =====
  // 从腾讯云微搭后台获取：https://console.cloud.tencent.com/lowcode
  env: process.env.REACT_APP_TCB_ENV_ID || 'your-cloudbase-env-id',
  appId: process.env.REACT_APP_APP_ID || 'weda',

  // ===== TextIn API 配置 =====
  // 从 TextIn 官网获取：https://www.textin.com/
  textinAppId: process.env.REACT_APP_TEXTIN_APP_ID || '8b4ca98b6e13453d93e732c213177d5e',
  textinSecretCode: process.env.REACT_APP_TEXTIN_SECRET_CODE || '39977574ef71c6987ac026b92d7dcf19',

  // ===== 其他配置 =====
  apiTimeout: 60000, // API 超时时间（毫秒）
  maxFileSize: 50 * 1024 * 1024 // 最大文件大小（50MB）
};

// 导出配置对象
export default envConfig;