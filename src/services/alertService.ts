// 报警服务 - 处理外部报警通知

export interface AlertInfo {
  type: 'error' | 'buffer' | 'connection';
  message: string;
  streamUrl: string;
  timestamp: Date;
  errorCount: number;
  retryCount: number;
}

export interface DingTalkConfig {
  webhook: string;
}

export interface EmailConfig {
  server: string;
  port: number;
  username: string;
  password: string;
  to: string;
  subject: string;
}

// 钉钉报警
export const sendDingTalkAlert = async (config: DingTalkConfig, alert: AlertInfo): Promise<boolean> => {
  try {
    const message = {
      msgtype: 'markdown',
      markdown: {
        title: `直播流报警 - ${alert.type}`,
        text: `## 🚨 直播流报警通知

**报警类型:** ${getAlertTypeText(alert.type)}
**报警时间:** ${alert.timestamp.toLocaleString()}
**流地址:** ${alert.streamUrl}
**错误信息:** ${alert.message}
**错误次数:** ${alert.errorCount}
**重试次数:** ${alert.retryCount}

请及时检查直播流状态！`
      }
    };

    const response = await fetch(config.webhook, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      console.error('钉钉报警发送失败:', response.statusText);
      return false;
    }

    const result = await response.json();
    if (result.errcode !== 0) {
      console.error('钉钉报警发送失败:', result.errmsg);
      return false;
    }

    console.log('钉钉报警发送成功');
    return true;
  } catch (error) {
    console.error('钉钉报警发送异常:', error);
    return false;
  }
};

// 邮箱报警
export const sendEmailAlert = async (config: EmailConfig, alert: AlertInfo): Promise<boolean> => {
  try {
    // 构建邮件内容
    const subject = config.subject
      .replace('{type}', getAlertTypeText(alert.type))
      .replace('{message}', alert.message);

    const emailContent = `
<html>
<head>
  <meta charset="utf-8">
  <title>直播流报警通知</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .alert { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; }
    .error { background-color: #f8d7da; border: 1px solid #f5c6cb; }
    .info { background-color: #d1ecf1; border: 1px solid #bee5eb; }
    .warning { background-color: #fff3cd; border: 1px solid #ffeaa7; }
    .title { color: #721c24; font-size: 18px; font-weight: bold; margin-bottom: 10px; }
    .detail { margin: 5px 0; }
    .label { font-weight: bold; color: #495057; }
  </style>
</head>
<body>
  <div class="alert ${getAlertClass(alert.type)}">
    <div class="title">🚨 直播流报警通知</div>
    <div class="detail"><span class="label">报警类型:</span> ${getAlertTypeText(alert.type)}</div>
    <div class="detail"><span class="label">报警时间:</span> ${alert.timestamp.toLocaleString()}</div>
    <div class="detail"><span class="label">流地址:</span> ${alert.streamUrl}</div>
    <div class="detail"><span class="label">错误信息:</span> ${alert.message}</div>
    <div class="detail"><span class="label">错误次数:</span> ${alert.errorCount}</div>
    <div class="detail"><span class="label">重试次数:</span> ${alert.retryCount}</div>
    <br>
    <div style="color: #721c24; font-weight: bold;">请及时检查直播流状态！</div>
  </div>
</body>
</html>`;

    // 使用浏览器内置的邮件功能（如果支持）
    if ('mailto' in navigator) {
      const mailtoLink = `mailto:${config.to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailContent)}`;
      window.open(mailtoLink);
      return true;
    }

    // 如果浏览器不支持 mailto，尝试使用 SMTP（需要后端支持）
    console.warn('浏览器不支持直接发送邮件，请配置后端 SMTP 服务');
    return false;

  } catch (error) {
    console.error('邮箱报警发送异常:', error);
    return false;
  }
};

// 辅助函数
const getAlertTypeText = (type: string): string => {
  switch (type) {
    case 'error': return '播放错误';
    case 'buffer': return '缓冲超时';
    case 'connection': return '连接中断';
    default: return '未知错误';
  }
};

const getAlertClass = (type: string): string => {
  switch (type) {
    case 'error': return 'error';
    case 'buffer': return 'warning';
    case 'connection': return 'error';
    default: return 'info';
  }
};

// 统一报警接口
export const sendExternalAlert = async (
  dingTalkConfig: DingTalkConfig | null,
  emailConfig: EmailConfig | null,
  alert: AlertInfo
): Promise<void> => {
  const promises: Array<Promise<boolean>> = [];

  if (dingTalkConfig && dingTalkConfig.webhook) {
    promises.push(sendDingTalkAlert(dingTalkConfig, alert));
  }

  if (emailConfig && emailConfig.to) {
    promises.push(sendEmailAlert(emailConfig, alert));
  }

  if (promises.length > 0) {
    try {
      await Promise.allSettled(promises);
    } catch (error) {
      console.error('外部报警发送失败:', error);
    }
  }
}; 
