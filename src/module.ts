import { PanelPlugin } from '@grafana/data';
import { SimpleOptions } from './types';
import { SimplePanel } from './components/SimplePanel';

export const plugin = new PanelPlugin<SimpleOptions>(SimplePanel).setPanelOptions((builder) => {
  return builder
    .addTextInput({
      path: 'text',
      name: 'Simple text option',
      description: 'Description of panel option',
      defaultValue: 'Default value of text input option',
    })
    .addBooleanSwitch({
      path: 'showSeriesCount',
      name: 'Show series counter',
      defaultValue: false,
    })
    .addRadio({
      path: 'seriesCountSize',
      defaultValue: 'sm',
      name: 'Series counter size',
      settings: {
        options: [
          {
            value: 'sm',
            label: 'Small',
          },
          {
            value: 'md',
            label: 'Medium',
          },
          {
            value: 'lg',
            label: 'Large',
          },
        ],
      },
      showIf: (config) => config.showSeriesCount,
    })
    .addTextInput({
      path: 'videoUrl',
      name: '视频流地址',
      description: '支持 m3u8、flv、rtmp 格式',
      defaultValue: '',
    })
    .addBooleanSwitch({
      path: 'enableAlerts',
      name: '启用报警',
      description: '启用流监控报警功能',
      defaultValue: true,
    })
    .addNumberInput({
      path: 'errorThreshold',
      name: '错误阈值',
      description: '连续错误次数达到此值时触发报警',
      defaultValue: 3,
      showIf: (config) => config.enableAlerts,
    })
    .addNumberInput({
      path: 'bufferThreshold',
      name: '缓冲阈值(秒)',
      description: '缓冲时间超过此值时触发报警',
      defaultValue: 10,
      showIf: (config) => config.enableAlerts,
    })
    .addBooleanSwitch({
      path: 'alertSound',
      name: '声音报警',
      description: '启用声音报警提示',
      defaultValue: true,
      showIf: (config) => config.enableAlerts,
    })
    .addBooleanSwitch({
      path: 'alertVisual',
      name: '视觉报警',
      description: '启用视觉报警提示',
      defaultValue: true,
      showIf: (config) => config.enableAlerts,
    })
    .addBooleanSwitch({
      path: 'enableDingTalk',
      name: '钉钉报警',
      description: '启用钉钉机器人报警',
      defaultValue: false,
      showIf: (config) => config.enableAlerts,
    })
    .addTextInput({
      path: 'dingTalkWebhook',
      name: '钉钉 Webhook',
      description: '钉钉机器人 webhook URL',
      defaultValue: '',
      showIf: (config) => config.enableAlerts && config.enableDingTalk,
    })
    .addBooleanSwitch({
      path: 'enableEmail',
      name: '邮箱报警',
      description: '启用邮箱报警',
      defaultValue: false,
      showIf: (config) => config.enableAlerts,
    })
    .addTextInput({
      path: 'emailServer',
      name: 'SMTP 服务器',
      description: '邮箱 SMTP 服务器地址',
      defaultValue: 'smtp.qq.com',
      showIf: (config) => config.enableAlerts && config.enableEmail,
    })
    .addNumberInput({
      path: 'emailPort',
      name: 'SMTP 端口',
      description: '邮箱 SMTP 端口',
      defaultValue: 587,
      showIf: (config) => config.enableAlerts && config.enableEmail,
    })
    .addTextInput({
      path: 'emailUsername',
      name: '邮箱用户名',
      description: '发件人邮箱地址',
      defaultValue: '',
      showIf: (config) => config.enableAlerts && config.enableEmail,
    })
    .addTextInput({
      path: 'emailPassword',
      name: '邮箱密码',
      description: '邮箱授权码或密码',
      defaultValue: '',
      showIf: (config) => config.enableAlerts && config.enableEmail,
    })
    .addTextInput({
      path: 'emailTo',
      name: '收件人邮箱',
      description: '接收报警邮件的邮箱地址',
      defaultValue: '',
      showIf: (config) => config.enableAlerts && config.enableEmail,
    })
    .addTextInput({
      path: 'emailSubject',
      name: '邮件主题',
      description: '报警邮件主题模板，支持 {type} {message} 变量',
      defaultValue: '直播流报警: {type} - {message}',
      showIf: (config) => config.enableAlerts && config.enableEmail,
    });
});
