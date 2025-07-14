**Target Audience and Usage Scenarios for the Live Stream Panel Plugin**
The primary target audience for this panel plugin includes:

- **IT Operations Teams**

Who need to monitor the health and status of live video streams (such as m3u8, flv, rtmp) in real time, especially in industries like media, broadcasting, security surveillance, and online education.

- **NOC (Network Operations Center) Engineers**

Who require a unified dashboard to visualize, switch, and monitor multiple live streams, and receive instant alerts when stream errors or interruptions occur.

- **DevOps and SREs**

Who want to integrate live stream quality monitoring into their existing Grafana dashboards, correlating stream status with infrastructure and application metrics.

- **Business Users and Managers**

Who need a visual overview of live stream availability and quality, with the ability to quickly identify and respond to issues.
**How Grafana Users Can Use This Plugin:**

- **Real-time Stream Monitoring:**

Users can embed one or more live video streams directly into their Grafana dashboards, supporting m3u8, flv, and rtmp formats. The panel automatically selects the appropriate player and provides a seamless viewing experience.

- **Dynamic Stream Switching:**

The panel can dynamically list and switch between multiple stream URLs, either manually (via dropdown) or automatically from data sources like ClickHouse.

- **Alerting and Incident Response:**

The plugin monitors stream status (playing, buffering, errors, reconnections, etc.) and supports configurable alerting (visual, sound, DingTalk, email). This helps users respond quickly to stream interruptions or quality issues.

- **Error Logging and Troubleshooting:**

All stream errors and alert events are logged and displayed within the panel, making it easy for users to review recent issues and troubleshoot problems.

- **Integration with Existing Grafana Workflows:**

By leveraging Grafana’s flexible dashboarding and alerting ecosystem, users can correlate live stream health with other business or technical metrics, creating a comprehensive monitoring solution.
**Typical Use Cases:**
- Monitoring live broadcast channels in a TV station or streaming platform.
- Supervising security camera feeds in a control room.
- Ensuring the availability and quality of online education or webinar streams.
- Providing business stakeholders with a real-time overview of critical live video services.

---
**In summary:**
This plugin is designed for any Grafana user who needs to monitor, visualize, and receive alerts for live video streams as part of their operational dashboards.

# ✅ 已实现的功能
## 1. 多格式视频流支持
- m3u8 - 使用 hls.js 播放
- flv - 使用 flv.js 播放
- rtmp - 转换为 flv 格式播放
## 2. ClickHouse 数据源集成
- 自动从查询结果中提取 video_url 字段
- 支持多路流切换
- 无数据时回退到面板设置中的地址
## 3. 流状态监控
- 实时状态显示 - 播放中/缓冲中/错误/未播放
- 错误监控 - 显示具体错误信息
- 重试计数 - 记录重连次数
- 时间戳 - 显示最后更新时间
## 4. 用户界面
- 流切换下拉框 - 多路流时自动显示
- 状态监控面板 - 右上角显示实时状态
- 颜色指示器 - 绿色(播放中)、黄色(缓冲中)、红色(错误)、灰色(未播放)
# 🚀 使用方法
- 部署插件 - 将 dist 目录复制到 Grafana 插件目录
- 启用插件 - 在 Grafana 管理界面启用 "Live Panel"
- 创建面板 - 添加 "Live Panel" 到仪表盘
- 配置数据源 - 选择 ClickHouse 并编写包含 video_url 字段的查询
- 监控流状态 - 面板会自动显示流状态和错误信息
