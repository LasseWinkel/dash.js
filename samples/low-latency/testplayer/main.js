var METRIC_INTERVAL = 1000 / 30;
var DATA_DOWNLOAD_TIME = 80;

var App = function () {
    this.player = null;
    this.controlbar = null;
    this.video = null;
    this.chart = null;
    this.domElements = {
        settings: {},
        metrics: {},
        chart: {}
    }
    this.chartTimeout = null;
    this.chartReportingInterval = 1000;
    this.chartNumberOfEntries = 30;
    this.chartData = {
        playbackTime: 0,
        lastTimeStamp: null
    }
};

App.prototype.init = function () {
    this._setDomElements();
    this._adjustSettingsByUrlParameters();
    this._registerEventHandler();
    this._startIntervalHandler();
    this._setupLineChart();
}

App.prototype._setDomElements = function () {
    this.domElements.settings.targetLatency = document.getElementById('target-latency');
    this.domElements.settings.maxDrift = document.getElementById('max-drift');
    this.domElements.settings.maxCatchupPlaybackRate = document.getElementById('max-catchup-playback-rate');
    this.domElements.settings.minCatchupPlaybackRate = document.getElementById('min-catchup-playback-rate');
    this.domElements.settings.catchupEnabled = document.getElementById('live-catchup-enabled');
    this.domElements.settings.abrThroughputRule = document.getElementById('abr-throughput')
    this.domElements.settings.abrBolaRule = document.getElementById('abr-bola')
    this.domElements.settings.abrInsufficientBufferRule = document.getElementById('abr-insufficient')
    this.domElements.settings.abrDroppedFramesRule = document.getElementById('abr-dropped');
    this.domElements.settings.abrAbandonRequestRule = document.getElementById('abr-abandon');
    this.domElements.settings.abrSwitchHistoryRule = document.getElementById('abr-switch');
    this.domElements.settings.abrLoLPRule = document.getElementById('abr-lolp');
    this.domElements.settings.abrL2ARule = document.getElementById('abr-l2a');
    this.domElements.settings.targetLatency = document.getElementById('target-latency');
    this.domElements.settings.exportSettingsUrl = document.getElementById('export-settings-url');
    this.domElements.settings.additionalApisNetworkInformation = document.getElementById('network-api');

    this.domElements.chart.metricChart = document.getElementById('metric-chart');
    this.domElements.chart.enabled = document.getElementById('chart-enabled');
    this.domElements.chart.interval = document.getElementById('chart-interval');
    this.domElements.chart.numberOfEntries = document.getElementById('chart-number-of-entries');

    this.domElements.metrics.latencyTag = document.getElementById('latency-tag');
    this.domElements.metrics.playbackrateTag = document.getElementById('playbackrate-tag');
    this.domElements.metrics.bufferTag = document.getElementById('buffer-tag');
    this.domElements.metrics.totalLatencyTag = document.getElementById('total-latency-tag');
    this.domElements.metrics.avgBehindLiveTag = document.getElementById('avg-behind-live-tag');
    this.domElements.metrics.avgBufferTag = document.getElementById('avg-buffer-tag');
    this.domElements.metrics.avgTotalLatencyTag = document.getElementById('avg-total-latency-tag');
    this.domElements.metrics.sec = document.getElementById('sec');
    this.domElements.metrics.min = document.getElementById('min');
    this.domElements.metrics.videoMaxIndex = document.getElementById('video-max-index');
    this.domElements.metrics.videoIndex = document.getElementById('video-index');
    this.domElements.metrics.videoBitrate = document.getElementById('video-bitrate');
    this.domElements.metrics.streamTime = document.getElementById('stream-time-tag');
    this.domElements.metrics.totalFrames = document.getElementById('total-frames-tag');
    this.domElements.metrics.renderedFrames = document.getElementById('rendered-frames-tag');
    this.domElements.metrics.droppedFrames = document.getElementById('dropped-frames-tag');
    this.domElements.metrics.stallEvents = document.getElementById('stall-events-tag');
    this.domElements.metrics.stallDuration = document.getElementById('stall-duration-tag');
    this.domElements.metrics.bitrate = document.getElementById('bitrate-tag');
    this.domElements.metrics.frameRate = document.getElementById('frame-rate-tag');
    this.domElements.metrics.resolution = document.getElementById('resolution-tag');
}

App.prototype._load = function () {
    var url;

    if (this.player) {
        this.player.reset();
        this._unregisterDashEventHandler();
        this.chartData.playbackTime = 0;
        this.chartData.lastTimeStamp = null
    }

    url = document.getElementById('manifest').value;

    this.video = document.querySelector('video');
    this.player = dashjs.MediaPlayer().create();
    this._registerDashEventHandler();
    this._applyParameters();
    this.player.initialize(this.video, url, true);
    this.controlbar = new ControlBar(this.player);
    this.controlbar.initialize();
}

App.prototype._applyParameters = function () {

    if (!this.player) {
        return;
    }

    var settings = this._getCurrentSettings();

    this.player.updateSettings({
        streaming: {
            delay: {
                liveDelay: 0
            },
            buffer: {
                // enableSeekDecorrelationFix: false,
                // fastSwitchEnabled: true,
                // flushBufferAtTrackSwitch: false,
                // reuseExistingSourceBuffers: true,
                // bufferPruningInterval: 1,
                // bufferToKeep: 1,
                bufferTimeAtTopQuality: 0.001,
                bufferTimeAtTopQualityLongForm: 0.001,
                bufferTimeDefault: 0.001,
                // initialBufferLevel: 0.1,
                // stableBufferTime: 1,
                longFormContentDurationThreshold: 600,
                // stallThreshold: 0.3,
                // useAppendWindow: true,
                // setStallState: true,
                // avoidCurrentTimeRangePruning: false,
                // useChangeTypeForTrackSwitch: true,
                // mediaSourceDurationInfinity: true,
                // resetSourceBuffersForTrackSwitch: false
            },
            liveCatchup: {
                enabled: settings.catchupEnabled,
                maxDrift: settings.maxDrift,
                playbackRate: {
                    min: settings.minCatchupPlaybackRate,
                    max: settings.maxCatchupPlaybackRate
                },
                mode: settings.catchupMechanism
            },
            abr: {
                rules: {
                    throughputRule: {
                        active: settings.abrThroughputRule
                    },
                    bolaRule: {
                        active: settings.abrBolaRule
                    },
                    insufficientBufferRule: {
                        active: settings.abrInsufficientBufferRule
                    },
                    switchHistoryRule: {
                        active: settings.abrSwitchHistoryRule
                    },
                    droppedFramesRule: {
                        active: settings.abrDroppedFramesRule
                    },
                    abandonRequestsRule: {
                        active: settings.abrAbandonRequestRule
                    },
                    l2ARule: {
                        active: settings.abrL2ARule
                    },
                    loLPRule: {
                        active: settings.abrLoLPRule
                    },
                },
                throughput: {
                    averageCalculationMode: settings.throughputEstimation,
                    lowLatencyDownloadTimeCalculationMode: settings.downloadTimeEstimation,
                    useNetworkInformationApi: {
                        fetch: settings.additionalApisNetworkInformation
                    }
                }

            }
        }
    });
}

App.prototype._exportSettings = function () {
    var settings = this._getCurrentSettings();
    var url = document.location.origin + document.location.pathname;

    url += '?';

    for (var [key, value] of Object.entries(settings)) {
        url += '&' + key + '=' + value
    }

    url = encodeURI(url);
    const element = document.createElement('textarea');
    element.value = url;
    document.body.appendChild(element);
    element.select();
    document.execCommand('copy');
    document.body.removeChild(element);

    Swal.fire({
        position: 'top-end',
        icon: 'success',
        title: 'Settings URL copied to clipboard',
        showConfirmButton: false,
        timer: 1500
    })
}

App.prototype._adjustSettingsByUrlParameters = function () {
    var urlSearchParams = new URLSearchParams(window.location.search);
    var params = Object.fromEntries(urlSearchParams.entries());

    if (params) {
        if (params.targetLatency !== undefined) {
            this.domElements.settings.targetLatency.value = parseFloat(params.targetLatency).toFixed(1);
        }
        if (params.maxDrift !== undefined) {
            this.domElements.settings.maxDrift.value = parseFloat(params.maxDrift).toFixed(1);
        }
        if (params.minCatchupPlaybackRate !== undefined) {
            this.domElements.settings.minCatchupPlaybackRate.value = parseFloat(params.minCatchupPlaybackRate).toFixed(2);
        }
        if (params.maxCatchupPlaybackRate !== undefined) {
            this.domElements.settings.maxCatchupPlaybackRate.value = parseFloat(params.maxCatchupPlaybackRate).toFixed(2);
        }
        if (params.abrThroughputRule !== undefined) {
            this.domElements.settings.abrThroughputRule.checked = params.abrThroughputRule === 'true';
        }
        if (params.abrBolaRule !== undefined) {
            this.domElements.settings.abrBolaRule.checked = params.abrBolaRule === 'true';
        }
        if (params.abrInsufficientBufferRule !== undefined) {
            this.domElements.settings.abrInsufficientBufferRule.checked = params.abrInsufficientBufferRule === 'true';
        }
        if (params.abrAbandonRequestRule !== undefined) {
            this.domElements.settings.abrAbandonRequestRule.checked = params.abrAbandonRequestRule === 'true';
        }
        if (params.abrSwitchHistoryRule !== undefined) {
            this.domElements.settings.abrSwitchHistoryRule.checked = params.abrSwitchHistoryRule === 'true';
        }
        if (params.abrDroppedFramesRule !== undefined) {
            this.domElements.settings.abrDroppedFramesRule.checked = params.abrDroppedFramesRule === 'true';
        }
        if (params.abrL2ARule !== undefined) {
            this.domElements.settings.abrL2ARule.checked = params.abrL2ARule === 'true';
        }
        if (params.abrLoLPRule !== undefined) {
            this.domElements.settings.abrLoLPRule.checked = params.abrLoLPRule === 'true';
        }
        if (params.catchupEnabled !== undefined) {
            this.domElements.settings.catchupEnabled.checked = params.catchupEnabled === 'true';
        }
        if (params.catchupMechanism !== undefined) {
            document.getElementById(params.catchupMechanism).checked = true;
        }
        if (params.throughputEstimation !== undefined) {
            document.getElementById(params.throughputEstimation).checked = true;
        }
        if (params.downloadEstimation !== undefined) {
            document.getElementById(params.downloadEstimation).checked = true;
        }
        if (params.additionalApisNetworkInformation !== undefined) {
            document.getElementById(params.additionalApisNetworkInformation).checked = true;
        }
    }

}

App.prototype._getCurrentSettings = function () {
    var targetLatency = parseFloat(this.domElements.settings.targetLatency.value, 10);
    var maxDrift = parseFloat(this.domElements.settings.maxDrift.value, 10);
    var minCatchupPlaybackRate = parseFloat(this.domElements.settings.minCatchupPlaybackRate.value, 10);
    var maxCatchupPlaybackRate = parseFloat(this.domElements.settings.maxCatchupPlaybackRate.value, 10);
    var abrThroughputRule = this.domElements.settings.abrThroughputRule.checked;
    var abrBolaRule = this.domElements.settings.abrBolaRule.checked;
    var abrInsufficientBufferRule = this.domElements.settings.abrInsufficientBufferRule.checked;
    var abrDroppedFramesRule = this.domElements.settings.abrDroppedFramesRule.checked;
    var abrAbandonRequestRule = this.domElements.settings.abrAbandonRequestRule.checked;
    var abrSwitchHistoryRule = this.domElements.settings.abrSwitchHistoryRule.checked;
    var abrLoLPRule = this.domElements.settings.abrLoLPRule.checked;
    var abrL2ARule = this.domElements.settings.abrL2ARule.checked;
    var catchupEnabled = this.domElements.settings.catchupEnabled.checked;
    var additionalApisNetworkInformation = this.domElements.settings.additionalApisNetworkInformation.checked;
    var catchupMechanism = document.querySelector('input[name="catchup"]:checked').value;
    var downloadTimeEstimation = document.querySelector('input[name="download-estimation"]:checked').value;
    var throughputEstimation = document.querySelector('input[name="throughput-estimation"]:checked').value;

    return {
        targetLatency,
        maxDrift,
        minCatchupPlaybackRate,
        maxCatchupPlaybackRate,
        abrThroughputRule,
        abrBolaRule,
        abrInsufficientBufferRule,
        abrDroppedFramesRule,
        abrAbandonRequestRule,
        abrSwitchHistoryRule,
        abrLoLPRule,
        abrL2ARule,
        catchupMechanism,
        catchupEnabled,
        downloadTimeEstimation,
        throughputEstimation,
        additionalApisNetworkInformation
    }
}

App.prototype._setupLineChart = function () {
    var data = {
        datasets: [
            {
                label: 'Live delay',
                borderColor: '#3944bc',
                backgroundColor: '#3944bc',
            },
            {
                label: 'Buffer level',
                borderColor: '#d0312d',
                backgroundColor: '#d0312d',
            },
            {
                label: 'Playback rate',
                borderColor: '#3cb043',
                backgroundColor: '#3cb043',
            }]
    };
    var config = {
        type: 'line',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 0
            },
            scales: {
                y: {
                    min: 0,
                    ticks: {
                        stepSize: 0.5
                    },
                    title: {
                        display: true,
                        text: 'Value in Seconds'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Value in Seconds'
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: true,
                    text: 'Live data',
                    y: {
                        text: 'y-axis'
                    }
                }
            }
        },
    };

    // eslint-disable-next-line no-undef
    this.chart = new Chart(
        this.domElements.chart.metricChart,
        config
    );

    this._enableChart(true);
}

App.prototype._enableChart = function (enabled) {
    if (!enabled && this.chartTimeout) {
        clearTimeout(this.chartTimeout);
        this.chartTimeout = null;
        return;
    }

    if (this.chartTimeout && enabled) {
        return;
    }

    this._updateChartData();

}

App.prototype._updateChartData = function () {
    var self = this;

    this.chartTimeout = setTimeout(function () {
        if (self.player && self.player.isReady()) {
            const data = self.chart.data;
            if (data.datasets.length > 0) {

                if (data.labels.length > self.chartNumberOfEntries) {
                    data.labels.shift();
                }

                if (self.chartData.lastTimeStamp) {
                    self.chartData.playbackTime += Date.now() - self.chartData.lastTimeStamp;
                }

                data.labels.push(parseFloat(self.chartData.playbackTime / 1000).toFixed(3));

                self.chartData.lastTimeStamp = Date.now();

                for (var i = 0; i < data.datasets.length; i++) {
                    if (data.datasets[i].data.length > self.chartNumberOfEntries) {
                        data.datasets[i].data.shift();
                    }
                }
                data.datasets[0].data.push(parseFloat(self.player.getCurrentLiveLatency()).toFixed(2));

                var dashMetrics = self.player.getDashMetrics();
                data.datasets[1].data.push(parseFloat(dashMetrics.getCurrentBufferLevel('video')).toFixed(2));

                data.datasets[2].data.push(parseFloat(self.player.getPlaybackRate()).toFixed(2));

                self.chart.update();
            }
        }
        self._updateChartData();
    }, self.chartReportingInterval)

}

App.prototype._adjustChartSettings = function () {

    if (!isNaN(parseInt(this.domElements.chart.interval.value))) {
        this.chartReportingInterval = parseInt(this.domElements.chart.interval.value);
    }

    if (!isNaN(parseInt(this.domElements.chart.numberOfEntries.value))) {
        this.chartNumberOfEntries = parseInt(this.domElements.chart.numberOfEntries.value);
    }

    this._enableChart(this.domElements.chart.enabled.checked);
}

function downloadCollectedDashMetrics(data) {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute('href', dataStr);
    const downloadName = 'dash_frag100res1080fps30bit6gop2loss0delay0bw100.json';
    downloadAnchorNode.setAttribute('download', downloadName);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

App.prototype._startIntervalHandler = function () {
    var self = this;
    var collectedDashMetrics = [];
    var passedSeconds = 0;
    var totalStallDuration = 0;
    var stallStartTime = 0;
    var stallEvents = 0;

    setInterval(function () {
        if (self.player && self.player.isReady()) {
            var dashMetrics = self.player.getDashMetrics();
            if (self.player.getActiveStream()) {
                var streamInfo = self.player.getActiveStream().getStreamInfo();
            }
            var dashAdapter = self.player.getDashAdapter();

            const periodIdx = streamInfo.index;
            var repSwitch = dashMetrics.getCurrentRepresentationSwitch('video', true);
            var bitrate = repSwitch ? Math.round(dashAdapter.getBandwidthForRepresentation(repSwitch.to, periodIdx) / 1000) : NaN;
            var currentRep = self.player.getCurrentRepresentationForType('video');

            var frameRate = parseInt(currentRep.frameRate.split('/')[0], 10);
            var resolution = currentRep.width + 'x' + currentRep.height;

            var currentLatency = parseFloat(self.player.getCurrentLiveLatency(), 10);
            self.domElements.metrics.latencyTag.innerHTML = currentLatency + ' secs';

            var currentBuffer = dashMetrics.getCurrentBufferLevel('video');
            self.domElements.metrics.bufferTag.innerHTML = currentBuffer + ' secs';

            var totalLatency = parseFloat((currentLatency + currentBuffer).toFixed(3), 10);
            self.domElements.metrics.totalLatencyTag.innerHTML = totalLatency + ' secs';

            if (passedSeconds === 0) {
                setTimeout(() => {
                    downloadCollectedDashMetrics(collectedDashMetrics)
                }, DATA_DOWNLOAD_TIME * 1000);
                var videoElement = self.video;
                videoElement.addEventListener('waiting', function() {
                    stallStartTime = Date.now();
                    stallEvents++;
                });

                videoElement.addEventListener('playing', function() {
                    if (stallStartTime !== 0) {
                        var stallEndTime = Date.now();
                        var stallDuration = (stallEndTime - stallStartTime) / 1000;

                        totalStallDuration += stallDuration;

                        stallStartTime = 0;
                    }
                });
            }

            var quality = self.video.getVideoPlaybackQuality();
            var totalFrames = quality.totalVideoFrames;
            var droppedFrames = quality.droppedVideoFrames;
            var renderedFrames = totalFrames - droppedFrames;

            if (passedSeconds <= DATA_DOWNLOAD_TIME) {
                collectedDashMetrics.push({
                    second: passedSeconds,
                    behindLive: currentLatency,
                    buffer: currentBuffer,
                    totalLatency,
                    totalFrames,
                    renderedFrames,
                    droppedFrames,
                    stallDuration: totalStallDuration,
                    stallEvents,
                    bitrate,
                    frameRate,
                    resolution
                })
                passedSeconds += METRIC_INTERVAL / 1000
            }
            self.domElements.metrics.streamTime.innerHTML = passedSeconds.toFixed(3) + ' secs';

            self.domElements.metrics.totalFrames.innerHTML = totalFrames;
            self.domElements.metrics.renderedFrames.innerHTML = renderedFrames;
            self.domElements.metrics.droppedFrames.innerHTML = droppedFrames;

            self.domElements.metrics.stallEvents.innerHTML = stallEvents;
            self.domElements.metrics.stallDuration.innerHTML = totalStallDuration.toFixed(3) + ' secs';

            self.domElements.metrics.frameRate.innerHTML = frameRate + ' fps';
            self.domElements.metrics.bitrate.innerHTML = bitrate + ' Kbps';
            self.domElements.metrics.resolution.innerHTML = resolution;

            const latestCollectedData = collectedDashMetrics.filter((aData) => passedSeconds - aData.second <= 5)
            const averageBehindLive = latestCollectedData.reduce((accumulator, currentValue) => accumulator + currentValue.behindLive, 0) / latestCollectedData.length;
            const averageBuffer = latestCollectedData.reduce((accumulator, currentValue) => accumulator + currentValue.buffer, 0) / latestCollectedData.length;
            const averageTotalLatency = latestCollectedData.reduce((accumulator, currentValue) => accumulator + currentValue.totalLatency, 0) / latestCollectedData.length;

            self.domElements.metrics.avgBehindLiveTag.innerHTML = averageBehindLive.toFixed(3) + ' secs';
            self.domElements.metrics.avgBufferTag.innerHTML = averageBuffer.toFixed(3) + ' secs';
            self.domElements.metrics.avgTotalLatencyTag.innerHTML = averageTotalLatency.toFixed(3) + ' secs';

            var currentPlaybackRate = self.player.getPlaybackRate();
            self.domElements.metrics.playbackrateTag.innerHTML = Math.round(currentPlaybackRate * 1000) / 1000;

            var d = new Date();
            var seconds = d.getSeconds();
            self.domElements.metrics.sec.innerHTML = (seconds < 10 ? '0' : '') + seconds;
            var minutes = d.getMinutes();
            self.domElements.metrics.min.innerHTML = (minutes < 10 ? '0' : '') + minutes + ':';
        }

    }, METRIC_INTERVAL);
}

App.prototype._registerEventHandler = function () {
    var self = this;

    document.getElementById('apply-settings-button').addEventListener('click', function () {
        self._applyParameters();
        Swal.fire({
            position: 'top-end',
            icon: 'success',
            title: 'Settings applied',
            showConfirmButton: false,
            timer: 1500
        })
    })

    document.getElementById('load-button').addEventListener('click', function () {
        self._load();
    })

    document.getElementById('export-settings-button').addEventListener('click', function () {
        self._exportSettings();
    })

    document.getElementById('chart-settings-button').addEventListener('click', function () {
        self._adjustChartSettings();
        Swal.fire({
            position: 'top-end',
            icon: 'success',
            title: 'Settings applied',
            showConfirmButton: false,
            timer: 1500
        })
    })
}

App.prototype._registerDashEventHandler = function () {
    this.player.on(dashjs.MediaPlayer.events.REPRESENTATION_SWITCH, this._onRepresentationSwitch, this);
}

App.prototype._unregisterDashEventHandler = function () {
    this.player.on(dashjs.MediaPlayer.events.REPRESENTATION_SWITCH, this._onRepresentationSwitch, this);
}

App.prototype._onRepresentationSwitch = function (e) {
    try {
        if (e.mediaType === 'video') {
            this.domElements.metrics.videoMaxIndex.innerHTML = e.numberOfRepresentations
            this.domElements.metrics.videoIndex.innerHTML = e.currentRepresentation.index + 1;
            var bitrate = Math.round(e.currentRepresentation.bandwidth / 1000);
            this.domElements.metrics.videoBitrate.innerHTML = bitrate;
        }
    } catch (e) {

    }
}



