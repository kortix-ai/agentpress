class CryptoBotTrader {
    constructor() {
        this.initEventListeners();
        this.setupOrderTypeToggle();
        this.setupBotManagement();
    }

    initEventListeners() {
        this.setupWalletConnection();
        this.setupTradingActions();
    }

    setupWalletConnection() {
        const connectWalletBtn = document.querySelector('.connect-wallet');
        connectWalletBtn.addEventListener('click', () => {
            this.connectWallet();
        });
    }

    connectWallet() {
        const walletOptions = ['MetaMask', 'WalletConnect', 'Coinbase Wallet'];
        const selectedWallet = this.showWalletSelectionModal(walletOptions);
    }

    showWalletSelectionModal(wallets) {
        const modal = document.createElement('div');
        modal.classList.add('wallet-modal');
        modal.innerHTML = `
            <div class="modal-content">
                <h2>Connect Wallet</h2>
                <div class="wallet-list">
                    ${wallets.map(wallet => `
                        <button class="wallet-option" data-wallet="${wallet}">
                            ${wallet}
                        </button>
                    `).join('')}
                </div>
                <button class="close-modal">Cancel</button>
            </div>
        `;
        document.body.appendChild(modal);
        
        modal.querySelectorAll('.wallet-option').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const wallet = e.target.dataset.wallet;
                console.log(`Connecting to ${wallet}`);
                document.body.removeChild(modal);
            });
        });

        modal.querySelector('.close-modal').addEventListener('click', () => {
            document.body.removeChild(modal);
        });
    }

    setupTradingActions() {
        const buyButton = document.querySelector('.buy-action');
        const sellButton = document.querySelector('.sell-action');

        buyButton.addEventListener('click', () => this.executeTrade('buy'));
        sellButton.addEventListener('click', () => this.executeTrade('sell'));
    }

    executeTrade(type) {
        const tradePair = document.getElementById('tradePairSelect').value;
        const amount = document.querySelector('.trade-input input').value;

        if (!amount) {
            alert('Please enter a trade amount');
            return;
        }

        const tradeConfirmation = confirm(`Confirm ${type.toUpperCase()} ${amount} of ${tradePair}?`);
        
        if (tradeConfirmation) {
            console.log(`Executing ${type} trade for ${amount} ${tradePair}`);
        }
    }

    setupOrderTypeToggle() {
        const orderTypeButtons = document.querySelectorAll('.order-type-selector button');
        
        orderTypeButtons.forEach(button => {
            button.addEventListener('click', () => {
                orderTypeButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
            });
        });
    }

    setupBotManagement() {
        const createBotBtn = document.querySelector('.create-bot-btn');
        const editBotBtns = document.querySelectorAll('.edit-bot');
        const stopBotBtns = document.querySelectorAll('.stop-bot');

        createBotBtn.addEventListener('click', () => this.createNewBot());
        
        editBotBtns.forEach(btn => {
            btn.addEventListener('click', () => this.editBot(btn.closest('.bot-card-advanced')));
        });

        stopBotBtns.forEach(btn => {
            btn.addEventListener('click', () => this.stopBot(btn.closest('.bot-card-advanced')));
        });
    }

    createNewBot() {
        const botStrategies = ['Momentum', 'Arbitrage', 'Mean Reversion', 'Trend Following'];
        const strategy = this.showBotCreationModal(botStrategies);
    }

    showBotCreationModal(strategies) {
        const modal = document.createElement('div');
        modal.classList.add('bot-creation-modal');
        modal.innerHTML = `
            <div class="modal-content">
                <h2>Create New Trading Bot</h2>
                <select id="botStrategy">
                    ${strategies.map(strategy => `
                        <option value="${strategy}">${strategy}</option>
                    `).join('')}
                </select>
                <div class="bot-config-inputs">
                    <input type="number" placeholder="Investment Amount" min="10">
                    <input type="number" placeholder="Take Profit %" min="1" max="100">
                    <input type="number" placeholder="Stop Loss %" min="1" max="100">
                </div>
                <div class="modal-actions">
                    <button class="create-bot">Create Bot</button>
                    <button class="close-modal">Cancel</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        modal.querySelector('.create-bot').addEventListener('click', () => {
            const strategy = document.getElementById('botStrategy').value;
            console.log(`Creating ${strategy} bot`);
            document.body.removeChild(modal);
        });

        modal.querySelector('.close-modal').addEventListener('click', () => {
            document.body.removeChild(modal);
        });
    }

    editBot(botElement) {
        const botName = botElement.querySelector('h3').textContent;
        console.log(`Editing bot: ${botName}`);
    }

    stopBot(botElement) {
        const botName = botElement.querySelector('h3').textContent;
        const confirmation = confirm(`Are you sure you want to stop the ${botName}?`);
        
        if (confirmation) {
            botElement.querySelector('.bot-status').textContent = 'Stopped';
            botElement.querySelector('.bot-status').classList.remove('running');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new CryptoBotTrader();
});