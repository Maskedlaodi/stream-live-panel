import React, { useEffect, useRef, useState, ChangeEvent, useMemo, useCallback } from 'react';
import { PanelProps } from '@grafana/data';
import { SimpleOptions } from 'types';
import { sendExternalAlert, AlertInfo, DingTalkConfig, EmailConfig } from '../services/alertService';

interface Props extends PanelProps<SimpleOptions> {}

interface StreamStatus {
  isPlaying: boolean;
  isError: boolean;
  errorMessage: string;
  isBuffering: boolean;
  retryCount: number;
  lastUpdate: Date;
}

interface AlertState {
  isAlerting: boolean;
  alertType: 'error' | 'buffer' | 'connection' | null;
  alertMessage: string;
  alertTime: Date | null;
  consecutiveErrors: number;
  bufferStartTime: Date | null;
  lastExternalAlertTime: Date | null; // 防止重复发送外部报警
}

export const SimplePanel: React.FC<Props> = ({ options, data, width, height }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const [streamStatus, setStreamStatus] = useState<StreamStatus>({
    isPlaying: false,
    isError: false,
    errorMessage: '',
    isBuffering: false,
    retryCount: 0,
    lastUpdate: new Date(),
  });

  const [alertState, setAlertState] = useState<AlertState>({
    isAlerting: false,
    alertType: null,
    alertMessage: '',
    alertTime: null,
    consecutiveErrors: 0,
    bufferStartTime: null,
    lastExternalAlertTime: null,
  });

  // 错误日志，最多显示10条
  const [errorLogs, setErrorLogs] = useState<Array<{ time: string; message: string }>>([]);
  const [showAllLogs, setShowAllLogs] = useState(false);
  const appendErrorLog = useCallback((msg: string) => {
    setErrorLogs(prev => {
      const newLogs = [...prev, { time: new Date().toLocaleTimeString(), message: msg }];
      return newLogs.length > 10 ? newLogs.slice(-10) : newLogs;
    });
  }, []);

  // 1. 解析所有 video_url
  const urls = useMemo(() => {
    let result: string[] = [];
    if (data && data.series && data.series.length > 0) {
      data.series.forEach(series => {
        const field = series.fields.find(f => f.name === 'video_url');
        if (field && field.values) {
          for (let i = 0; i < field.values.length; i++) {
            const url = field.values.get(i);
            if (url && typeof url === 'string') {
              result.push(url);
            }
          }
        }
      });
    }
    // 若无数据则用 options.videoUrl
    if (result.length === 0 && options.videoUrl) {
      result = [options.videoUrl];
    }
    return result;
  }, [data, options.videoUrl]);

  // 2. 当前选中流
  const [currentUrl, setCurrentUrl] = useState(urls[0] || '');

  // 3. 切换流时更新 currentUrl
  useEffect(() => {
    setCurrentUrl(urls[0] || '');
    setStreamStatus(prev => ({
      ...prev,
      retryCount: 0,
      isError: false,
      errorMessage: '',
    }));
    setAlertState(prev => ({
      ...prev,
      consecutiveErrors: 0,
      bufferStartTime: null,
      isAlerting: false,
      alertType: null,
      lastExternalAlertTime: null,
    }));
  }, [urls]);

  // 4. 外部报警配置
  const dingTalkConfig: DingTalkConfig | null = useMemo(() => {
    if (!options.enableDingTalk || !options.dingTalkWebhook) {
      return null;
    }
    return {
      webhook: options.dingTalkWebhook,
    };
  }, [options.enableDingTalk, options.dingTalkWebhook]);

  const emailConfig: EmailConfig | null = useMemo(() => {
    if (!options.enableEmail || !options.emailTo || !options.emailUsername) {
      return null;
    }
    return {
      server: options.emailServer || 'smtp.qq.com',
      port: options.emailPort || 587,
      username: options.emailUsername,
      password: options.emailPassword || '',
      to: options.emailTo,
      subject: options.emailSubject || '直播流报警: {type} - {message}',
    };
  }, [options.enableEmail, options.emailTo, options.emailUsername, options.emailServer, options.emailPort, options.emailPassword, options.emailSubject]);

  // 5. 发送外部报警
  const sendExternalAlertNotification = useCallback(async (type: 'error' | 'buffer' | 'connection', message: string) => {
    // 防止重复发送（5分钟内不重复发送）
    const now = new Date();
    if (alertState.lastExternalAlertTime && 
        (now.getTime() - alertState.lastExternalAlertTime.getTime()) < 5 * 60 * 1000) {
      return;
    }

    const alertInfo: AlertInfo = {
      type,
      message,
      streamUrl: currentUrl,
      timestamp: now,
      errorCount: alertState.consecutiveErrors,
      retryCount: streamStatus.retryCount,
    };

    try {
      await sendExternalAlert(dingTalkConfig, emailConfig, alertInfo);
      setAlertState(prev => ({
        ...prev,
        lastExternalAlertTime: now,
      }));
    } catch (error) {
      appendErrorLog('外部报警发送失败: ' + (error instanceof Error ? error.message : String(error)));
      console.error('外部报警发送失败:', error);
    }
  }, [dingTalkConfig, emailConfig, currentUrl, alertState.consecutiveErrors, streamStatus.retryCount, alertState.lastExternalAlertTime, appendErrorLog]);

  // 6. 报警逻辑
  const triggerAlert = useCallback((type: 'error' | 'buffer' | 'connection', message: string) => {
    if (!options.enableAlerts) {return;}

    setAlertState(prev => ({
      ...prev,
      isAlerting: true,
      alertType: type,
      alertMessage: message,
      alertTime: new Date(),
    }));

    // 声音报警
    if (options.alertSound && audioRef.current) {
      audioRef.current.play().catch((e) => {
        appendErrorLog('播放报警声音失败: ' + (e instanceof Error ? e.message : String(e)));
        // 如果无法播放声音，使用浏览器内置的提示音
        console.log('播放报警声音失败');
      });
    }

    // 发送外部报警
    sendExternalAlertNotification(type, message);
    appendErrorLog(`触发报警: [${type}] ${message}`);
  }, [options.enableAlerts, options.alertSound, sendExternalAlertNotification, appendErrorLog]);

  const clearAlert = useCallback(() => {
    setAlertState(prev => ({
      ...prev,
      isAlerting: false,
      alertType: null,
      alertMessage: '',
    }));
  }, []);

  // 7. 缓冲时间监控
  useEffect(() => {
    if (!options.enableAlerts || !options.bufferThreshold) {return;}
    
    if (streamStatus.isBuffering) {
      if (!alertState.bufferStartTime) {
        setAlertState(prev => ({ ...prev, bufferStartTime: new Date() }));
      } else {
        const bufferDuration = (new Date().getTime() - alertState.bufferStartTime.getTime()) / 1000;
        if (bufferDuration > options.bufferThreshold) {
          triggerAlert('buffer', `缓冲时间过长: ${Math.round(bufferDuration)}秒`);
        }
      }
    } else {
      setAlertState(prev => ({ ...prev, bufferStartTime: null }));
      if (alertState.alertType === 'buffer') {
        clearAlert();
      }
    }
  }, [streamStatus.isBuffering, options.bufferThreshold, options.enableAlerts, alertState.bufferStartTime, alertState.alertType, triggerAlert, clearAlert]);

  // 8. 错误计数监控
  useEffect(() => {
    if (!options.enableAlerts || !options.errorThreshold) {return;}

    if (streamStatus.isError) {
      const newErrorCount = alertState.consecutiveErrors + 1;
      setAlertState(prev => ({ ...prev, consecutiveErrors: newErrorCount }));
      
      if (newErrorCount >= options.errorThreshold) {
        triggerAlert('error', `连续错误${newErrorCount}次: ${streamStatus.errorMessage}`);
      }
    } else {
      setAlertState(prev => ({ ...prev, consecutiveErrors: 0 }));
      if (alertState.alertType === 'error') {
        clearAlert();
      }
    }
  }, [streamStatus.isError, streamStatus.errorMessage, options.errorThreshold, options.enableAlerts, alertState.consecutiveErrors, alertState.alertType, triggerAlert, clearAlert]);

  // 9. 视频事件监听
  useEffect(() => {
    const video = videoRef.current;
    if (!video) {return;}

    const handlePlay = () => {
      setStreamStatus(prev => ({
        ...prev,
        isPlaying: true,
        isError: false,
        errorMessage: '',
        lastUpdate: new Date(),
      }));
      clearAlert();
    };

    const handlePause = () => {
      setStreamStatus(prev => ({
        ...prev,
        isPlaying: false,
        lastUpdate: new Date(),
      }));
    };

    const handleError = () => {
      setStreamStatus(prev => ({
        ...prev,
        isError: true,
        isPlaying: false,
        errorMessage: `播放错误: ${video.error?.message || '未知错误'}`,
        lastUpdate: new Date(),
      }));
      appendErrorLog('播放错误: ' + (video.error?.message || '未知错误'));
    };

    const handleWaiting = () => {
      setStreamStatus(prev => ({
        ...prev,
        isBuffering: true,
        lastUpdate: new Date(),
      }));
    };

    const handleCanPlay = () => {
      setStreamStatus(prev => ({
        ...prev,
        isBuffering: false,
        lastUpdate: new Date(),
      }));
    };

    const handleStalled = () => {
      triggerAlert('connection', '流连接中断');
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('error', handleError);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('stalled', handleStalled);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('error', handleError);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('stalled', handleStalled);
    };
  }, [triggerAlert, clearAlert, appendErrorLog]);

  // 10. 播放器逻辑
  useEffect(() => {
    if (!videoRef.current || !currentUrl) {
      return;
    }
    const video = videoRef.current;
    let hls: any = null;
    let flvPlayer: any = null;

    // 判断格式
    if (/\.m3u8($|\?)/i.test(currentUrl)) {
      import('hls.js').then(HlsModule => {
        const Hls = HlsModule.default;
        if (Hls.isSupported()) {
          hls = new Hls({
            debug: false,
            enableWorker: true,
            lowLatencyMode: true,
          });
          
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            setStreamStatus(prev => ({
              ...prev,
              isError: false,
              errorMessage: '',
            }));
          });

          hls.on(Hls.Events.ERROR, (event: any, data: any) => {
            setStreamStatus(prev => ({
              ...prev,
              isError: true,
              errorMessage: `HLS错误: ${data.details}`,
              retryCount: prev.retryCount + 1,
            }));
            appendErrorLog('HLS错误: ' + data.details);
          });

          hls.loadSource(currentUrl);
          hls.attachMedia(video);
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = currentUrl;
        }
      });
    } else if (/\.flv($|\?)/i.test(currentUrl) || currentUrl.startsWith('rtmp')) {
      import('flv.js').then(FlvModule => {
        const flvjs = FlvModule.default;
        if (flvjs.isSupported()) {
          flvPlayer = flvjs.createPlayer({
            type: 'flv',
            url: currentUrl,
            hasAudio: true,
            hasVideo: true,
          });

          flvPlayer.on(flvjs.Events.LOADING_COMPLETE, () => {
            setStreamStatus(prev => ({
              ...prev,
              isError: false,
              errorMessage: '',
            }));
          });

          flvPlayer.on(flvjs.Events.ERROR, (errorType: any, errorDetail: any) => {
            setStreamStatus(prev => ({
              ...prev,
              isError: true,
              errorMessage: `FLV错误: ${errorDetail}`,
              retryCount: prev.retryCount + 1,
            }));
            appendErrorLog('FLV错误: ' + errorDetail);
          });

          flvPlayer.attachMediaElement(video);
          flvPlayer.load();
          flvPlayer.play();
        }
      });
    } else {
      video.src = currentUrl;
    }
    // 清理
    return () => {
      if (hls) {
        hls.destroy();
      }
      if (flvPlayer) {
        flvPlayer.destroy();
      }
    };
  }, [currentUrl, appendErrorLog]);

  // 11. 状态显示样式
  const getStatusColor = () => {
    if (alertState.isAlerting) {return '#ff0000';}
    if (streamStatus.isError) {return '#ff4444';}
    if (streamStatus.isBuffering) {return '#ffaa00';}
    if (streamStatus.isPlaying) {return '#44ff44';}
    return '#888888';
  };

  return (
    <div style={{
      width,
      height,
      position: 'relative',
      background: '#000',
      overflow: 'hidden'
    }}>
      <video
        ref={videoRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100% !important',
          minWidth: '100%',
          minHeight: '100%',
          objectFit: 'cover',
          display: 'block',
          background: '#000',
          zIndex: 0
        }}
        controls
        autoPlay
      />

      {/* 声音报警元素 */}
      <audio ref={audioRef} preload="auto">
        <source src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT" type="audio/wav" />
      </audio>

      {/* 流切换下拉框 */}
      {urls.length > 1 && (
        <select
          style={{ position: 'absolute', zIndex: 2, top: 10, left: 10 }}
          value={currentUrl}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => setCurrentUrl(e.target.value)}
        >
          {urls.map((url, idx) => (
            <option value={url} key={url + idx}>
              {url}
            </option>
          ))}
        </select>
      )}

      {/* 状态监控面板 */}
      <div
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          background: 'rgba(0,0,0,0.8)',
          color: 'white',
          padding: '8px 12px',
          borderRadius: '4px',
          fontSize: '12px',
          zIndex: 2,
          minWidth: '150px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: getStatusColor(),
              marginRight: '6px',
              animation: alertState.isAlerting ? 'blink 1s infinite' : 'none',
            }}
          />
          <span>
            {alertState.isAlerting ? '报警中' :
             streamStatus.isError ? '错误' :
             streamStatus.isBuffering ? '缓冲中' :
             streamStatus.isPlaying ? '播放中' : '未播放'}
          </span>
        </div>
        {alertState.isAlerting && (
          <div style={{ color: '#ff6666', fontSize: '10px', marginTop: '4px' }}>
            {alertState.alertMessage}
          </div>
        )}
        {streamStatus.isError && !alertState.isAlerting && (
          <div style={{ color: '#ff6666', fontSize: '10px', marginTop: '4px' }}>
            {streamStatus.errorMessage}
          </div>
        )}
        <div style={{ fontSize: '10px', color: '#ccc', marginTop: '4px' }}>
          重试: {streamStatus.retryCount} | 
          错误: {alertState.consecutiveErrors} | 
          更新: {streamStatus.lastUpdate.toLocaleTimeString()}
        </div>
        {/* 外部报警状态 */}
        {(dingTalkConfig || emailConfig) && (
          <div style={{ fontSize: '10px', color: '#aaa', marginTop: '4px' }}>
            {dingTalkConfig && '钉钉 '}
            {emailConfig && '邮箱 '}
            报警已配置
          </div>
        )}
      </div>

      {/* 视觉报警覆盖层 */}
      {alertState.isAlerting && options.alertVisual && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(255, 0, 0, 0.1)',
            border: '3px solid #ff0000',
            zIndex: 1,
            animation: 'blink 0.5s infinite',
          }}
        />
      )}

      {/* 错误日志区域，浮在视频上方 */}
      {errorLogs.length > 0 && (
        <div style={{
          position: 'absolute',
          left: 10,
          bottom: 10,
          right: 10,
          background: 'rgba(30,30,30,0.85)',
          color: '#ffbaba',
          fontSize: '12px',
          borderRadius: '4px',
          padding: '8px',
          zIndex: 10,
          height: showAllLogs ? '110px' : '28px',
          maxHeight: '110px',
          overflowY: showAllLogs ? 'auto' : 'hidden',
          cursor: 'pointer',
          transition: 'height 0.2s',
          pointerEvents: 'auto',
        }}
        onClick={() => setShowAllLogs(v => !v)}
        title={showAllLogs ? '点击收起' : '点击展开全部日志'}
        >
          <div style={{ fontWeight: 'bold', color: '#fff', marginBottom: 4, display: 'flex', alignItems: 'center' }}>
            错误日志
            <span style={{ marginLeft: 8, fontSize: 10, color: '#aaa' }}>{showAllLogs ? '（点击收起）' : '（点击展开）'}</span>
          </div>
          {showAllLogs
            ? errorLogs.map((log, idx) => (
                <div key={idx} style={{ marginBottom: 2 }}>
                  <span style={{ color: '#aaa' }}>[{log.time}]</span> {log.message}
                </div>
              ))
            : (
                <div>
                  <span style={{ color: '#aaa' }}>[{errorLogs[errorLogs.length-1].time}]</span> {errorLogs[errorLogs.length-1].message}
                </div>
              )
          }
        </div>
      )}

      <style>
        {`
          @keyframes blink {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
          }

          .kuoxh-panel-content video {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100% !important;
            min-width: 100% !important;
            min-height: 100% !important;
            object-fit: cover !important;
            background: #000 !important;
            z-index: 0 !important;
            display: block !important;
          }

          .kuoxh-panel-content {
            height: 100% !important;
            min-height: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            position: relative !important;
            background: #000 !important;
          }
        `}
      </style>
    </div>
  );
}; 
