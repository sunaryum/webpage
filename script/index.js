  // Import do Supabase
        import { supabase } from './supabase.js';

        // Funções de utilidade
        async function wakeUpAPI() {
            try {
                console.log('[WakeUp] Acordando API...');
                const response = await fetch('https://airdrop-sunaryum.onrender.com/api/wallet/ping', {
                    method: 'GET',
                    cache: 'no-cache'
                });
                if (response.ok) console.log('[WakeUp] API acordada');
            } catch (err) {
                console.error('[WakeUp] Erro ao acordar API:', err);
            }
        }

        function createParticles() {
            const particlesContainer = document.getElementById('particles');
            if (!particlesContainer) return;
            
            particlesContainer.innerHTML = '';
            const particleCount = 30;
            
            wakeUpAPI();
            
            for (let i = 0; i < particleCount; i++) {
                const particle = document.createElement('div');
                particle.classList.add('particle');
                
                const size = Math.random() * 15 + 5;
                particle.style.width = `${size}px`;
                particle.style.height = `${size}px`;
                particle.style.left = `${Math.random() * 100}%`;
                
                const duration = Math.random() * 20 + 10;
                const delay = Math.random() * 5;
                particle.style.animationDuration = `${duration}s`;
                particle.style.animationDelay = `${delay}s`;
                
                particlesContainer.appendChild(particle);
            }
        }

        // Gerenciamento de usuário
        async function registerOrUpdateUser(walletAddress) {
            try {
                const username = walletAddress.slice(-4);
                const now = new Date().toISOString();
                
                const { data: existingUser, error: selectError } = await supabase
                    .from('users')
                    .select('id')
                    .eq('wallet_address', walletAddress)
                    .maybeSingle();
                
                if (selectError) throw selectError;
                
                if (existingUser) {
                    // Atualiza wallet_address se estiver null
                    const updates = { last_login: now };
                    if (!existingUser.wallet_address) {
                        updates.wallet_address = walletAddress;
                    }

                    const { error: updateError } = await supabase
                        .from('users')
                        .update(updates)
                        .eq('id', existingUser.id);
                    if (updateError) throw updateError;
                    return existingUser.id;
                } else {
                    const { data: inserted, error: insertError } = await supabase
                        .from('users')
                        .insert({
                            wallet_address: walletAddress,
                            username,
                            created_at: now,
                            last_login: now,
                            total_checkins: 0 
                        })
                        .select('id')
                        .maybeSingle();
                    if (insertError) throw insertError;
                    return inserted.id;
                }
            } catch (error) {
                console.error('Erro no registro:', error);
                return null;
            }
        }

         async function setupWalletConnection() {
            const walletOptionsContainer = document.getElementById('walletOptionsContainer');
            const walletTabMessage = document.getElementById('walletTabMessage');
            let currentWallet = null;
            
            // Função para lidar com mensagens da extensão
            function handleExtensionMessage(event) {
                if (event.source !== window) return;
                
                if (event.data && event.data.type === 'WALLET_CONNECTED') {
                    console.log('[DEBUG] Mensagem da extensão recebida:', event.data);
                    
                    if (event.data.data?.address) {
                        handleWalletConnect(event.data.data);
                    } else if (event.data.address) {
                        handleWalletConnect({
                            address: event.data.address,
                            publicKey: event.data.publicKey
                        });
                    } else {
                        console.error('Formato inválido:', event.data);
                        resetConnectButton();
                    }
                }
            }
            
            // Registrar o listener antes de qualquer operação
            window.addEventListener('message', handleExtensionMessage);

            async function isExtensionInstalled() {
                return new Promise((resolve) => {
                    if (window.__SUNARYUM_EXTENSION_INSTALLED__) {
                        return resolve(true);
                    }
                    
                    const timeoutId = setTimeout(() => {
                        window.removeEventListener('message', responseListener);
                        resolve(false);
                    }, 800);
                    
                    function responseListener(event) {
                        if (event.source !== window) return;
                        if (event.data.type === 'EXTENSION_DETECTION_RESPONSE') {
                            clearTimeout(timeoutId);
                            window.removeEventListener('message', responseListener);
                            resolve(true);
                        }
                    }
                    
                    window.addEventListener('message', responseListener);
                    window.postMessage({
                        type: 'EXTENSION_DETECTION_REQUEST',
                        origin: window.location.origin
                    }, '*');
                });
            }
            
            async function handleWalletConnect(data) {
                if (!data?.address) {
                    console.error('Dados incompletos:', data);
                    resetConnectButton();
                    return;
                }
                
                const userId = await registerOrUpdateUser(data.address);
                localStorage.setItem('sunaryumWalletAddress', data.address);
                if (userId) localStorage.setItem('sunaryumUserId', userId);
                
                currentWallet = data;
                
                await triggerConfettiEffect();

                // REDIRECIONAMENTO DIRETO
                window.location.href = 'airdrop/dashboard/';
            }
            
            async function triggerConfettiEffect() {
                return new Promise(resolve => {
                    const particlesContainer = document.getElementById('particles');
                    if (!particlesContainer) return resolve();
                    
                    const burstParticles = 50;
                    for (let i = 0; i < burstParticles; i++) {
                        const particle = document.createElement('div');
                        particle.classList.add('particle', 'burst-particle');
                        
                        const size = Math.random() * 20 + 5;
                        const color = `hsl(${Math.random() * 60 + 30}, 100%, 50%)`;
                        const duration = Math.random() * 2 + 1;
                        
                        particle.style.width = `${size}px`;
                        particle.style.height = `${size}px`;
                        particle.style.backgroundColor = color;
                        particle.style.left = `${Math.random() * 100}%`;
                        particle.style.top = `${Math.random() * 100}%`;
                        particle.style.animation = `burst ${duration}s forwards`;
                        
                        particlesContainer.appendChild(particle);
                        setTimeout(() => particle.remove(), duration * 1000);
                    }
                    setTimeout(resolve, 1000);
                });
            }
            
            function resetConnectButton() {
                const connectBtn = document.getElementById('connectWalletBtn');
                if (connectBtn) {
                    connectBtn.innerHTML = 'Connect Wallet';
                    connectBtn.disabled = false;
                }
            }
             const connectBtn = document.getElementById('connectWalletBtn');
            if (connectBtn) {
                connectBtn.addEventListener('click', async () => {
                    console.log('Botão Conectar Clicado');
                    
                    // Abre o modal
                    walletModal.classList.remove('hidden');
                    walletModal.classList.add('flex');
                    document.body.style.overflow = 'hidden';
                    
                    // Configura as opções
                    await setupWalletOptions();
                    
                    // Timeout para garantir que tudo está carregado
                    setTimeout(async () => {
                        const installed = await isExtensionInstalled();
                        if (!installed) return;
                        
                        connectBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connecting...';
                        connectBtn.disabled = true;
                        
                        window.postMessage({
                            type: 'OPEN_WALLET_CONNECT',
                            origin: window.location.origin
                        }, '*');
                        
                        // Timeout para resposta da extensão
                        setTimeout(() => {
                            if (!currentWallet) {
                                resetConnectButton();
                                alert('Connection timed out! Please check the extension.');
                            }
                        }, 10000); // 10 segundos
                    }, 500);
                });
            }
            // Configura opções de carteira no modal
            async function setupWalletOptions() {
                const installed = await isExtensionInstalled();
                
                if (installed) {
                    walletTabMessage.textContent = 'Connect with your preferred wallet';
                    
                    const sunaryumOption = document.createElement('button');
                    sunaryumOption.className = 'wallet-option w-full bg-dark-700 hover:bg-dark-600 text-white rounded-xl p-4 flex items-center';
                    sunaryumOption.innerHTML = `
                        <div class="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-400 flex items-center justify-center mr-4">
                            <i class="fas fa-wallet"></i>
                        </div>
                        <div class="text-left">
                            <div class="font-medium">Sunaryum Wallet</div>
                            <div class="text-xs text-gray-400">Our official wallet</div>
                        </div>
                    `;
                    
                    sunaryumOption.addEventListener('click', async () => {
                        console.log('Sunaryum Wallet selected');
                        connectBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Conectando...';
                        connectBtn.disabled = true;
                        
                        window.postMessage({
                            type: 'OPEN_WALLET_CONNECT',
                            origin: window.location.origin
                        }, '*');
                        
                        setTimeout(() => {
                            if (!currentWallet) {
                                resetConnectButton();
                                alert('Tempo esgotado! Verifique a extensão.');
                            }
                        }, 5000);
                    });
                    
                    walletOptionsContainer.innerHTML = '';
                    walletOptionsContainer.appendChild(sunaryumOption);
                } else {
                    walletTabMessage.textContent = 'Extension not installed. Please choose an option:';
                    
                    const installOption = document.createElement('button');
                    installOption.id = 'installExtensionOption';
                    installOption.className = 'wallet-option w-full bg-dark-700 hover:bg-dark-600 text-white rounded-xl p-4 flex items-center';
                    installOption.innerHTML = `
                        <div class="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-400 flex items-center justify-center mr-4">
                            <i class="fas fa-download"></i>
                        </div>
                        <div class="text-left">
                            <div class="font-medium">Install Extension</div>
                            <div class="text-xs text-gray-400">Get from official store</div>
                        </div>
                    `;
                    
                    installOption.addEventListener('click', () => {
                        window.open('https://addons.mozilla.org/firefox/addon/sunaryum-wallet/', '_blank');
                    });
                    
                    const createOption = document.createElement('button');
                    createOption.id = 'createWalletOption';
                    createOption.className = 'wallet-option w-full bg-dark-700 hover:bg-dark-600 text-white rounded-xl p-4 flex items-center';
                    createOption.innerHTML = `
                        <div class="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-400 flex items-center justify-center mr-4">
                            <i class="fas fa-plus-circle"></i>
                        </div>
                        <div class="text-left">
                            <div class="font-medium">Create Wallet</div>
                            <div class="text-xs text-gray-400">Without extension</div>
                        </div>
                    `;
                    
                    createOption.addEventListener('click', () => {
                        document.getElementById('createTab').click();
                    });
                    
                    walletOptionsContainer.innerHTML = '';
                    walletOptionsContainer.appendChild(installOption);
                    walletOptionsContainer.appendChild(createOption);
                }
            }
            
            connectBtn.addEventListener('click', async () => {
                console.log('Botão Conectar Clicado');
                const installed = await isExtensionInstalled();
                
                // Abre o modal
                walletModal.classList.remove('hidden');
                walletModal.classList.add('flex');
                document.body.style.overflow = 'hidden';
                
                // Configura as opções
                await setupWalletOptions();
            });
            
            window.addEventListener('message', (event) => {
                if (event.data.type === 'WALLET_CONNECTED') {
                    if (event.data.data?.address) {
                        handleWalletConnect(event.data.data);
                    } else if (event.data.address) {
                        handleWalletConnect({
                            address: event.data.address,
                            publicKey: event.data.publicKey
                        });
                    } else {
                        console.error('Formato inválido:', event.data);
                        resetConnectButton();
                    }
                }
            });
            
            if (typeof browser !== 'undefined') {
                window.addEventListener('message', (event) => {
                    if (event.data.type === 'OPEN_WALLET_CONNECT') {
                        browser.runtime.sendMessage({
                            action: "openConnectWindow",
                            origin: event.data.origin
                        });
                    }
                });
                
                browser.runtime.onMessage.addListener((msg) => {
                    if (msg.action === "walletDataUpdate") {
                        window.postMessage({
                            type: 'WALLET_CONNECTED',
                            data: msg.data
                        }, '*');
                    }
                });
            }
            const connectBtnHero = document.getElementById('connectWalletBtnHero');
if (connectBtnHero) {
    connectBtnHero.addEventListener('click', async () => {
        console.log('Botão Hero Conectar Clicado');
        
        // Abre o modal
        walletModal.classList.remove('hidden');
        walletModal.classList.add('flex');
        document.body.style.overflow = 'hidden';
        
        // Configura as opções
        await setupWalletOptions();
        
        // Mesma lógica de timeout para extensão
        setTimeout(async () => {
            const installed = await isExtensionInstalled();
            if (!installed) return;
            
            connectBtnHero.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connecting...';
            connectBtnHero.disabled = true;
            
            window.postMessage({
                type: 'OPEN_WALLET_CONNECT',
                origin: window.location.origin
            }, '*');
            
            setTimeout(() => {
                if (!currentWallet) {
                    connectBtnHero.innerHTML = 'Connect Wallet';
                    connectBtnHero.disabled = false;
                    alert('Connection timed out! Please check the extension.');
                }
            }, 10000);
        }, 500);
    });
}
            return { getWalletState: () => currentWallet };
        }

        // Sistema de Modais
        const noExtensionModal = document.getElementById('noExtensionModal');
        const walletModal = document.getElementById('walletModal');
        const closeButtons = document.querySelectorAll('.close');
        const modalState = {
            isSeedVisible: false,
            generated: false
        };

        const modalElements = {
            generateSeedBtn: document.getElementById('generateSeedBtn'),
            toggleVisibilityBtn: document.getElementById('toggleVisibilityBtn'),
            copySeedBtn: document.getElementById('copySeedBtn'),
            createWalletBtn: document.getElementById('createWalletBtn'),
            seedPhraseGrid: document.getElementById('seedPhraseGrid'),
            seedInput: document.getElementById('seedInput'),
            importBtn: document.getElementById('importBtn'),
            importStatus: document.getElementById('importStatus'),
            createTab: document.getElementById('createTab'),
            importTab: document.getElementById('importTab'),
            walletTab: document.getElementById('walletTab'),
            createTabContent: document.getElementById('createTabContent'),
            importTabContent: document.getElementById('importTabContent'),
            walletTabContent: document.getElementById('walletTabContent')
        };

        let walletData = null;

        function resetModalState() {
            modalState.isSeedVisible = false;
            modalState.generated = false;
            walletData = null;
            
            if (modalElements.seedPhraseGrid) 
                modalElements.seedPhraseGrid.innerHTML = '';
            
            if (modalElements.importStatus) {
                modalElements.importStatus.textContent = '';
                modalElements.importStatus.className = 'status-message';
            }
            
            if (modalElements.generateSeedBtn) {
                modalElements.generateSeedBtn.innerHTML = '<i class="fas fa-redo mr-2"></i> Generate New';
                modalElements.generateSeedBtn.disabled = false;
            }
            
            updateVisibilityUI();
            updateModalUIState();
        }

        function openModal(modal) {
            if (!modal) return;
            modal.style.display = 'flex';
            
            if (modal.id === 'walletModal') {
                resetModalState();
            }
        }

        function closeModal(modal) {
            if (!modal) return;
            modal.style.display = 'none';
        }

        function setupModalEventListeners() {
            if (modalElements.generateSeedBtn) {
                modalElements.generateSeedBtn.addEventListener('click', generateSeedPhrase);
            }
            
            if (modalElements.toggleVisibilityBtn) {
                modalElements.toggleVisibilityBtn.addEventListener('click', toggleSeedVisibility);
            }
            
            if (modalElements.copySeedBtn) {
                modalElements.copySeedBtn.addEventListener('click', copySeedPhrase);
            }
            
            if (modalElements.createWalletBtn) {
                modalElements.createWalletBtn.addEventListener('click', handleWalletCreation);
            }
            
            if (modalElements.importBtn) {
                modalElements.importBtn.addEventListener('click', importWallet);
            }
        }

        async function generateSeedPhrase() {
            if (!modalElements.generateSeedBtn) return;
            
            try {
                const originalHTML = modalElements.generateSeedBtn.innerHTML;
                modalElements.generateSeedBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
                modalElements.generateSeedBtn.disabled = true;
                
                const res = await fetch('https://airdrop-sunaryum.onrender.com/api/wallet/create');
                if (!res.ok) throw new Error('Erro no servidor');
                
                walletData = await res.json();
                renderSeedPhrase(walletData.mnemonic);
                
                modalElements.generateSeedBtn.innerHTML = originalHTML;
                modalElements.generateSeedBtn.disabled = false;
                modalState.generated = true;
                updateModalUIState();
                
            } catch (error) {
                console.error('Erro na geração:', error);
                modalElements.generateSeedBtn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Erro - Tentar novamente';
                
                setTimeout(() => {
                    modalElements.generateSeedBtn.innerHTML = '<i class="fas fa-redo mr-2"></i> Generate New';
                    modalElements.generateSeedBtn.disabled = false;
                }, 2000);
            }
        }

        function renderSeedPhrase(mnemonic) {
            if (!modalElements.seedPhraseGrid) return;
            
            modalElements.seedPhraseGrid.innerHTML = '';
            const words = mnemonic.split(' ');
            
            words.forEach((word, index) => {
                const wordEl = document.createElement('div');
                wordEl.className = 'seed-word';
                wordEl.dataset.word = word;
                
                wordEl.innerHTML = `
                    <span class="word-index">${index + 1}</span>
                    <span class="word-content">${'•'.repeat(word.length)}</span>
                `;
                
                modalElements.seedPhraseGrid.appendChild(wordEl);
            });
        }

        function toggleSeedVisibility() {
            modalState.isSeedVisible = !modalState.isSeedVisible;
            updateVisibilityUI();
            toggleSeedWords();
        }

        function updateVisibilityUI() {
            const icon = modalElements.toggleVisibilityBtn?.querySelector('i');
            const textSpan = modalElements.toggleVisibilityBtn?.querySelector('span');
            
            if (textSpan) {
                textSpan.textContent = modalState.isSeedVisible ? 'Hide Seed' : 'Show Seed';
            }
            
            if (icon) {
                icon.className = modalState.isSeedVisible ? 
                    'fas fa-eye-slash mr-2' : 'fas fa-eye mr-2';
            }
        }

        function toggleSeedWords() {
            const words = document.querySelectorAll('.seed-word');
            words.forEach(word => {
                const content = word.querySelector('.word-content');
                if (!content) return;
                
                if (modalState.isSeedVisible) {
                    content.textContent = word.dataset.word;
                    content.classList.add('visible');
                } else {
                    content.textContent = '•'.repeat(word.dataset.word?.length || 5);
                    content.classList.remove('visible');
                }
            });
        }

        function copySeedPhrase() {
            if (!walletData) return;
            
            navigator.clipboard.writeText(walletData.mnemonic)
                .then(() => {
                    const span = modalElements.copySeedBtn.querySelector('span');
                    if (span) {
                        const originalText = span.textContent;
                        span.textContent = 'Copied!';
                        modalElements.copySeedBtn.disabled = true;
                        
                        setTimeout(() => {
                            span.textContent = originalText;
                            modalElements.copySeedBtn.disabled = false;
                        }, 2000);
                    }
                })
                .catch(console.error);
        }

        function updateModalUIState() {
            if (modalElements.copySeedBtn) {
                modalElements.copySeedBtn.disabled = !modalState.generated;
            }
            
            if (modalElements.createWalletBtn) {
                modalElements.createWalletBtn.disabled = !modalState.generated;
            }
        }

        async function handleWalletCreation() {
            if (!walletData) return;
            
            modalElements.seedInput.value = walletData.mnemonic;
            modalElements.importTab.click();
            
            modalElements.importStatus.textContent = 'Processing your new wallet...';
            modalElements.importStatus.className = 'status-message';
            
            setTimeout(importWallet, 1000);
        }

        function showImportStatus(message, type) {
            if (!modalElements.importStatus) return;
            
            modalElements.importStatus.textContent = message;
            modalElements.importStatus.className = 'status-message';
            
            if (type === 'error') {
                modalElements.importStatus.classList.add('error');
            } else if (type === 'success') {
                modalElements.importStatus.classList.add('success');
            } else if (type === 'loading') {
                modalElements.importStatus.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${message}`;
            }
        }

        async function importWallet() {
            const seed = modalElements.seedInput.value.trim();
            const words = seed.split(/\s+/);
            
            if (words.length !== 12) {
                showImportStatus('Please enter a valid 12 word seed.', 'error');
                return;
            }
            
            showImportStatus('Importing your wallet...', 'loading');
            
            try {
                const res = await fetch('https://airdrop-sunaryum.onrender.com/api/wallet/import', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ mnemonic: seed })
                });
                
                if (!res.ok) {
                    const errorData = await res.json();
                    throw new Error(errorData.message || 'Erro na resposta do servidor');
                }
                
                const data = await res.json();
                saveWalletData(data);
                await finalizeWalletSetup(data.address);
                showImportStatus('✅ Wallet imported successfully! Redirecting...', 'success');
                
            } catch (error) {
                console.error('Erro na importação:', error);
                showImportStatus(`Falha na importação: ${error.message}`, 'error');
            }
        }

        function saveWalletData(data) {
            const walletData = {
                address: data.address,
                public_key: data.public_key,
                private_key: data.private_key,
                mnemonic: modalElements.seedInput.value.trim()
            };
            
            localStorage.setItem('walletData', JSON.stringify(walletData));
        }

        async function finalizeWalletSetup(address) {
            const userId = await registerOrUpdateUser(address);
            
            if (userId) {
                localStorage.setItem('sunaryumWalletAddress', address);
                localStorage.setItem('sunaryumUserId', userId);
                
                setTimeout(() => {
                    window.location.href = 'airdrop/dashboard/';
                }, 2000);
                return true;
            }
            return false;
        }

        function setupModals() {
            const closeModalBtn = document.getElementById('closeModal');
            
            if (closeModalBtn) {
                closeModalBtn.addEventListener('click', () => {
                    walletModal.classList.add('hidden');
                    walletModal.classList.remove('flex');
                    document.body.style.overflow = '';
                });
            }
            
            // Tab switching functionality
            function switchTab(activeTab, activeContent) {
                // Reset all tabs
                [modalElements.walletTab, modalElements.createTab, modalElements.importTab].forEach(tab => {
                    tab.classList.remove('text-primary', 'border-primary');
                    tab.classList.add('text-gray-400');
                });
                
                // Hide all content
                [modalElements.walletTabContent, modalElements.createTabContent, modalElements.importTabContent].forEach(content => {
                    content.classList.add('hidden');
                });
                
                // Activate selected tab and content
                activeTab.classList.remove('text-gray-400');
                activeTab.classList.add('text-primary', 'border-primary');
                activeContent.classList.remove('hidden');
            }
            
            // Add event listeners to tabs
            modalElements.walletTab.addEventListener('click', () => switchTab(modalElements.walletTab, modalElements.walletTabContent));
            modalElements.createTab.addEventListener('click', () => switchTab(modalElements.createTab, modalElements.createTabContent));
            modalElements.importTab.addEventListener('click', () => switchTab(modalElements.importTab, modalElements.importTabContent));
            
            // Switch to create tab from wallet tab
            document.getElementById('switchToCreate').addEventListener('click', () => {
                modalElements.createTab.click();
            });
            
            // Close modal when clicking outside
            walletModal.addEventListener('click', (e) => {
                if (e.target === walletModal) {
                    walletModal.classList.add('hidden');
                    walletModal.classList.remove('flex');
                    document.body.style.overflow = '';
                }
            });
        }

        // Inicialização
        document.addEventListener('DOMContentLoaded', () => {
            setupWalletConnection();
            createParticles();
            updateUserCounter();
            setupModals();
            setupModalEventListeners();
            
            // Generate energy grid cells
            const energyGrid = document.querySelector('.energy-grid');
            for (let i = 0; i < 36; i++) {
                const cell = document.createElement('div');
                cell.classList.add('energy-cell');
                if (Math.random() > 0.7) {
                    cell.classList.add('active');
                }
                energyGrid.appendChild(cell);
            }
            
         async function getTotalUsers() {
    try {
        const { count, error } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true });

        if (error) throw error;
        return count;
    } catch (error) {
        console.error("Erro ao contar usuários:", error);
        return null;
    }
}

// Uso: atualize o contador na interface
async function updateUserCounter() {
    const totalUsers = await getTotalUsers();
    if (totalUsers !== null) {
        document.getElementById('userCount').textContent = totalUsers.toLocaleString();
    }
}
            const userCountEl = document.getElementById('userCount');
            
       updateUserCounter()
            
            // Animate energy cells
            setInterval(() => {
                const cells = document.querySelectorAll('.energy-cell');
                cells.forEach(cell => {
                    if (Math.random() > 0.8) {
                        cell.classList.toggle('active');
                    }
                });
            }, 1000);
        });
