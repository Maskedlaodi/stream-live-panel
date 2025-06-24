type SeriesSize = 'sm' | 'md' | 'lg';

export interface SimpleOptions {
  text: string;
  showSeriesCount: boolean;
  seriesCountSize: SeriesSize;
  videoUrl?: string;
  
  // 报警配置
  enableAlerts: boolean;
  errorThreshold: number; // 错误次数阈值
  bufferThreshold: number; // 缓冲时间阈值(秒)
  alertSound: boolean; // 是否启用声音报警
  alertVisual: boolean; // 是否启用视觉报警
  
  // 外部报警配置
  enableDingTalk: boolean; // 启用钉钉报警
  dingTalkWebhook: string; // 钉钉机器人 webhook URL
  enableEmail: boolean; // 启用邮箱报警
  emailServer: string; // SMTP 服务器
  emailPort: number; // SMTP 端口
  emailUsername: string; // 邮箱用户名
  emailPassword: string; // 邮箱密码
  emailTo: string; // 收件人邮箱
  emailSubject: string; // 邮件主题模板
}
