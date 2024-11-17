class CryptoChart {
    constructor(containerId) {
        this.containerId = containerId;
        this.chartContainer = document.getElementById(containerId);
        this.initChart();
    }

    initChart() {
        this.chart = LightweightCharts.createChart(this.chartContainer, {
            width: this.chartContainer.clientWidth,
            height: 400,
            layout: {
                backgroundColor: '#121212',
                textColor: '#FFFFFF'
            },
            grid: {
                vertLines: {
                    color: 'rgba(255, 255, 255, 0.1)'
                },
                horzLines: {
                    color: 'rgba(255, 255, 255, 0.1)'
                }
            },
            crosshair: {
                mode: LightweightCharts.CrosshairMode.Normal
            },
            priceScale: {
                borderColor: 'rgba(255, 255, 255, 0.2)'
            },
            timeScale: {
                borderColor: 'rgba(255, 255, 255, 0.2)'
            }
        });

        this.candlestickSeries = this.chart.addCandlestickSeries({
            upColor: '#4CAF50',
            downColor: '#F44336',
            wickUpColor: '#4CAF50',
            wickDownColor: '#F44336'
        });

        this.loadMockData();
        this.setupResponsiveness();
    }

    loadMockData() {
        const mockData = this.generateMockCandlestickData();
        this.candlestickSeries.setData(mockData);
    }

    generateMockCandlestickData() {
        const data = [];
        const basePrice = 45000;
        const volatility = 500;
        const startDate = new Date(2023, 5, 1);

        for (let i = 0; i < 100; i++) {
            const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
            const open = basePrice + (Math.random() * volatility * 2 - volatility);
            const close = open + (Math.random() * volatility * 2 - volatility);
            const high = Math.max(open, close) + Math.random() * volatility;
            const low = Math.min(open, close) - Math.random() * volatility;

            data.push({
                time: date.getTime() / 1000,
                open: open,
                high: high,
                low: low,
                close: close
            });
        }

        return data;
    }

    setupResponsiveness() {
        window.addEventListener('resize', () => {
            this.chart.resize(
                this.chartContainer.clientWidth, 
                400
            );
        });
    }

    updateChartPair(pair) {
        console.log(`Updating chart for ${pair}`);
        this.loadMockData();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const cryptoChart = new CryptoChart('tradingview-chart');

    const tradePairSelect = document.getElementById('tradePairSelect');
    tradePairSelect.addEventListener('change', (e) => {
        cryptoChart.updateChartPair(e.target.value);
    });
});