// Service Provider Directory Application
class ServiceDirectory {
    constructor() {
        this.providers = [];
        this.filteredProviders = [];
        this.categories = new Set();
        this.isLoading = false;
        this.lastUpdated = null;
        this.autoRefreshInterval = null;
        
        // Initialize after DOM elements are ready
        this.initializeDOMElements();
        this.init();
    }
    
    initializeDOMElements() {
        // Ensure all DOM elements are found
        this.searchInput = document.getElementById('searchInput');
        this.categoryFilter = document.getElementById('categoryFilter');
        this.sortSelect = document.getElementById('sortSelect');
        this.clearFiltersBtn = document.getElementById('clearFilters');
        this.providersGrid = document.getElementById('providersGrid');
        this.resultsCounter = document.getElementById('resultsCounter');
        this.loadingStatus = document.getElementById('loadingStatus');
        this.lastUpdatedSpan = document.getElementById('lastUpdated');
        this.footerLastUpdated = document.getElementById('footerLastUpdated');
        this.manualRefreshBtn = document.getElementById('manualRefresh');
        this.retryButton = document.getElementById('retryButton');
        this.emptyState = document.getElementById('emptyState');
        this.errorState = document.getElementById('errorState');
        
        // Modal elements
        this.adminModal = document.getElementById('adminModal');
        this.editInstructionsBtn = document.getElementById('editInstructions');
        this.closeModalBtn = document.getElementById('closeModal');
        
        // Log missing elements for debugging
        if (!this.searchInput) console.error('Search input not found');
        if (!this.categoryFilter) console.error('Category filter not found');
        if (!this.editInstructionsBtn) console.error('Edit instructions button not found');
    }
    
    async init() {
        // Ensure modal is hidden on initialization
        this.hideModal();
        this.bindEvents();
        await this.loadProviders();
        this.startAutoRefresh();
    }
    
    bindEvents() {
        // Search and filter events with null checks
        if (this.searchInput) {
            this.searchInput.addEventListener('input', this.debounce(() => {
                console.log('Search input changed:', this.searchInput.value);
                this.filterAndRender();
            }, 300));
        }
        
        if (this.categoryFilter) {
            this.categoryFilter.addEventListener('change', () => {
                console.log('Category filter changed:', this.categoryFilter.value);
                this.filterAndRender();
            });
        }
        
        if (this.sortSelect) {
            this.sortSelect.addEventListener('change', () => {
                console.log('Sort changed:', this.sortSelect.value);
                this.filterAndRender();
            });
        }
        
        if (this.clearFiltersBtn) {
            this.clearFiltersBtn.addEventListener('click', () => {
                this.clearFilters();
            });
        }
        
        // Refresh events
        if (this.manualRefreshBtn) {
            this.manualRefreshBtn.addEventListener('click', () => {
                this.loadProviders(true);
            });
        }
        
        if (this.retryButton) {
            this.retryButton.addEventListener('click', () => {
                this.loadProviders(true);
            });
        }
        
        // Modal events
        if (this.editInstructionsBtn) {
            this.editInstructionsBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Edit instructions button clicked');
                this.showModal();
            });
        }
        
        if (this.closeModalBtn) {
            this.closeModalBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.hideModal();
            });
        }
        
        // Close modal when clicking backdrop
        if (this.adminModal) {
            this.adminModal.addEventListener('click', (e) => {
                if (e.target === this.adminModal || e.target.classList.contains('modal__backdrop')) {
                    this.hideModal();
                }
            });
        }
        
        // Keyboard events for modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isModalVisible()) {
                this.hideModal();
            }
        });
    }
    
    async loadProviders(isManualRefresh = false) {
        if (this.isLoading && !isManualRefresh) return;
        
        this.isLoading = true;
        this.showLoadingState(isManualRefresh);
        
        try {
            console.log('Loading providers...');
            const response = await fetch('https://ppl-ai-code-interpreter-files.s3.amazonaws.com/web/direct-files/4996272993aab20302b4aa195fc6c65f/35b53282-f6c2-4d08-bb54-7def9ec9d84a/4f240bb5.json');
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Raw data loaded:', data);
            
            this.providers = this.processProviderData(data);
            console.log('Processed providers:', this.providers.length);
            
            this.extractCategories();
            console.log('Categories extracted:', Array.from(this.categories));
            
            this.populateCategoryFilter();
            this.lastUpdated = new Date();
            this.updateTimestamps();
            this.hideErrorState();
            this.filterAndRender();
            
        } catch (error) {
            console.error('Error loading providers:', error);
            this.showErrorState();
        } finally {
            this.isLoading = false;
            this.hideLoadingState();
        }
    }
    
    processProviderData(data) {
        if (!Array.isArray(data)) {
            console.error('Data is not an array:', data);
            return [];
        }
        
        return data.map(provider => ({
            company: provider.Company || 'Unknown Company',
            contact: provider.Contact || '',
            email: provider.email || '',
            phone: this.formatPhoneNumber(provider.number || ''),
            location: provider['Main Location'] || '',
            category: provider.Category || 'Other',
            specialty: provider.Specialty || '',
            serviceArea: provider.Service_Area || '',
            testimonial: provider.Testimonial || '',
            rating: Math.max(1, Math.min(5, parseInt(provider.Rating) || 3))
        }));
    }
    
    formatPhoneNumber(phone) {
        if (!phone) return '';
        // Remove all non-numeric characters
        const cleaned = phone.replace(/\D/g, '');
        // Format as (xxx) xxx-xxxx if 10 digits
        if (cleaned.length === 10) {
            return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
        }
        return phone; // Return original if not standard format
    }
    
    extractCategories() {
        this.categories.clear();
        this.providers.forEach(provider => {
            if (provider.category && provider.category !== 'Other') {
                this.categories.add(provider.category);
            }
        });
        console.log('Extracted categories:', Array.from(this.categories));
    }
    
    populateCategoryFilter() {
        if (!this.categoryFilter) {
            console.error('Category filter element not found');
            return;
        }
        
        const currentValue = this.categoryFilter.value;
        
        // Clear existing options except "All Categories"
        this.categoryFilter.innerHTML = '<option value="">All Categories</option>';
        
        // Add category options
        const sortedCategories = Array.from(this.categories).sort();
        console.log('Adding categories to dropdown:', sortedCategories);
        
        sortedCategories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            this.categoryFilter.appendChild(option);
        });
        
        // Restore previous selection if it still exists
        if (currentValue && Array.from(this.categories).includes(currentValue)) {
            this.categoryFilter.value = currentValue;
        }
        
        console.log('Category filter populated with', this.categoryFilter.options.length, 'options');
    }
    
    filterAndRender() {
        if (!this.providers || !Array.isArray(this.providers)) {
            console.error('No providers to filter');
            return;
        }
        
        const searchTerm = this.searchInput ? this.searchInput.value.toLowerCase().trim() : '';
        const selectedCategory = this.categoryFilter ? this.categoryFilter.value : '';
        
        console.log('Filtering with:', { searchTerm, selectedCategory });
        
        this.filteredProviders = this.providers.filter(provider => {
            // Search filter
            const searchFields = [
                provider.company,
                provider.contact,
                provider.category,
                provider.specialty,
                provider.serviceArea
            ].join(' ').toLowerCase();
            
            const matchesSearch = !searchTerm || searchFields.includes(searchTerm);
            
            // Category filter
            const matchesCategory = !selectedCategory || provider.category === selectedCategory;
            
            return matchesSearch && matchesCategory;
        });
        
        console.log('Filtered to', this.filteredProviders.length, 'providers');
        
        this.sortProviders();
        this.renderProviders();
        this.updateResultsCounter();
    }
    
    sortProviders() {
        const sortBy = this.sortSelect ? this.sortSelect.value : 'name';
        
        this.filteredProviders.sort((a, b) => {
            switch (sortBy) {
                case 'name':
                    return a.company.localeCompare(b.company);
                case 'rating':
                    return b.rating - a.rating;
                case 'category':
                    const categoryCompare = a.category.localeCompare(b.category);
                    return categoryCompare !== 0 ? categoryCompare : a.company.localeCompare(b.company);
                default:
                    return 0;
            }
        });
    }
    
    renderProviders() {
        if (!this.providersGrid) {
            console.error('Providers grid element not found');
            return;
        }
        
        if (this.filteredProviders.length === 0) {
            this.showEmptyState();
            return;
        }
        
        this.hideEmptyState();
        
        const cardsHTML = this.filteredProviders.map(provider => 
            this.createProviderCard(provider)
        ).join('');
        
        this.providersGrid.innerHTML = cardsHTML;
        console.log('Rendered', this.filteredProviders.length, 'provider cards');
    }
    
    createProviderCard(provider) {
        const categoryClass = this.getCategoryClass(provider.category);
        const starsHTML = this.createStarsHTML(provider.rating);
        
        return `
            <div class="provider-card">
                <div class="provider-card__header">
                    <h3 class="provider-card__name">${this.escapeHtml(provider.company)}</h3>
                    ${provider.contact ? `<p class="provider-card__contact">${this.escapeHtml(provider.contact)}</p>` : ''}
                </div>
                
                <div class="provider-card__meta">
                    <span class="provider-card__category ${categoryClass}">
                        ${this.escapeHtml(provider.category)}
                    </span>
                    <div class="provider-card__rating">
                        <div class="stars">${starsHTML}</div>
                        <span class="rating-text">${provider.rating}/5</span>
                    </div>
                </div>
                
                <div class="provider-card__contacts">
                    ${provider.phone ? `
                        <div class="contact-item">
                            <span>📞</span>
                            <a href="tel:${provider.phone.replace(/\D/g, '')}">${provider.phone}</a>
                        </div>
                    ` : ''}
                    ${provider.email ? `
                        <div class="contact-item">
                            <span>✉️</span>
                            <a href="mailto:${provider.email}">${provider.email}</a>
                        </div>
                    ` : ''}
                </div>
                
                ${provider.specialty ? `
                    <div class="provider-card__specialty">
                        <p class="provider-card__specialty-title">Specialty:</p>
                        <p class="provider-card__specialty-text">${this.escapeHtml(provider.specialty)}</p>
                    </div>
                ` : ''}
                
                ${provider.serviceArea ? `
                    <div class="provider-card__service-area">
                        <strong>Service Area:</strong> ${this.escapeHtml(provider.serviceArea)}
                    </div>
                ` : ''}
                
                ${provider.testimonial ? `
                    <blockquote class="provider-card__testimonial">
                        "${this.escapeHtml(provider.testimonial)}"
                    </blockquote>
                ` : ''}
            </div>
        `;
    }
    
    createStarsHTML(rating) {
        let starsHTML = '';
        for (let i = 1; i <= 5; i++) {
            const starClass = i <= rating ? 'star' : 'star star--empty';
            starsHTML += `<span class="${starClass}">★</span>`;
        }
        return starsHTML;
    }
    
    getCategoryClass(category) {
        const classMap = {
            'Mortgage Lender': 'provider-card__category--mortgage',
            'Home Inspector': 'provider-card__category--inspector',
            'Landscaping': 'provider-card__category--landscaping',
            'Home Services': 'provider-card__category--services'
        };
        return classMap[category] || 'provider-card__category--default';
    }
    
    escapeHtml(unsafe) {
        if (typeof unsafe !== 'string') return '';
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
    
    updateResultsCounter() {
        if (!this.resultsCounter) return;
        
        const count = this.filteredProviders.length;
        const text = count === 1 ? '1 provider found' : `${count} providers found`;
        this.resultsCounter.textContent = text;
    }
    
    updateTimestamps() {
        if (!this.lastUpdated) return;
        
        const timeString = this.lastUpdated.toLocaleTimeString();
        const dateString = this.lastUpdated.toLocaleDateString();
        
        if (this.lastUpdatedSpan) {
            this.lastUpdatedSpan.textContent = `Updated: ${timeString}`;
        }
        
        if (this.footerLastUpdated) {
            this.footerLastUpdated.textContent = `Last updated: ${dateString} at ${timeString}`;
        }
    }
    
    clearFilters() {
        if (this.searchInput) this.searchInput.value = '';
        if (this.categoryFilter) this.categoryFilter.value = '';
        if (this.sortSelect) this.sortSelect.value = 'name';
        this.filterAndRender();
    }
    
    showLoadingState(isManualRefresh = false) {
        if (isManualRefresh && this.manualRefreshBtn) {
            this.manualRefreshBtn.classList.add('refreshing');
        }
        
        if (this.loadingStatus) {
            this.loadingStatus.textContent = 'Loading...';
            this.loadingStatus.className = 'status status--info';
        }
    }
    
    hideLoadingState() {
        if (this.manualRefreshBtn) {
            this.manualRefreshBtn.classList.remove('refreshing');
        }
        
        if (this.loadingStatus) {
            this.loadingStatus.textContent = 'Ready';
            this.loadingStatus.className = 'status status--success';
        }
    }
    
    showErrorState() {
        if (this.errorState) {
            this.errorState.classList.remove('hidden');
        }
        if (this.providersGrid) {
            this.providersGrid.style.display = 'none';
        }
        if (this.loadingStatus) {
            this.loadingStatus.textContent = 'Error';
            this.loadingStatus.className = 'status status--error';
        }
    }
    
    hideErrorState() {
        if (this.errorState) {
            this.errorState.classList.add('hidden');
        }
        if (this.providersGrid) {
            this.providersGrid.style.display = 'grid';
        }
    }
    
    showEmptyState() {
        if (this.emptyState) {
            this.emptyState.classList.remove('hidden');
        }
        if (this.providersGrid) {
            this.providersGrid.innerHTML = '';
        }
    }
    
    hideEmptyState() {
        if (this.emptyState) {
            this.emptyState.classList.add('hidden');
        }
    }
    
    isModalVisible() {
        return this.adminModal && !this.adminModal.classList.contains('hidden');
    }
    
    showModal() {
        if (this.adminModal) {
            this.adminModal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
            // Focus the close button for accessibility
            setTimeout(() => {
                if (this.closeModalBtn) {
                    this.closeModalBtn.focus();
                }
            }, 100);
        }
    }
    
    hideModal() {
        if (this.adminModal) {
            this.adminModal.classList.add('hidden');
            document.body.style.overflow = '';
            // Return focus to the trigger button
            if (this.editInstructionsBtn) {
                this.editInstructionsBtn.focus();
            }
        }
    }
    
    startAutoRefresh() {
        // Auto-refresh every 10 minutes
        this.autoRefreshInterval = setInterval(() => {
            this.loadProviders();
        }, 10 * 60 * 1000);
    }
    
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    // Cleanup method
    destroy() {
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
        }
    }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing Service Directory...');
    window.serviceDirectory = new ServiceDirectory();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (window.serviceDirectory) {
        window.serviceDirectory.destroy();
    }
});