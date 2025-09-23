// Main Application Script
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize the application
    await initializeApp();
});

async function initializeApp() {
    try {
        // Initialize genres
        await ui.initializeGenres();
        
        // Load initial content (trending movies)
        await ui.loadTrendingMovies();
        
        // Setup event listeners
        setupEventListeners();
        
    } catch (error) {
        console.error('Failed to initialize app:', error);
        ui.showError('Failed to initialize the application. Please refresh the page.');
    }
}

function setupEventListeners() {
    // Search functionality
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            const query = e.target.value.trim();
            ui.searchMovies(query);
        }, 500);
    });
    
    searchBtn.addEventListener('click', () => {
        const query = searchInput.value.trim();
        ui.searchMovies(query);
    });
    
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const query = e.target.value.trim();
            ui.searchMovies(query);
        }
    });

    // Navigation buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const section = btn.dataset.section;
            ui.switchSection(section);
        });
    });

    // Filter controls
    const genreFilter = document.getElementById('genre-filter');
    const sortFilter = document.getElementById('sort-filter');
    
    genreFilter.addEventListener('change', () => {
        applyFilters();
    });
    
    sortFilter.addEventListener('change', () => {
        applyFilters();
    });

    // Modal close buttons
    document.getElementById('close-modal').addEventListener('click', () => {
        ui.closeMovieModal();
    });
    
    document.getElementById('close-review-modal').addEventListener('click', () => {
        ui.closeReviewModal();
    });
    
    // Cancel review button
    document.getElementById('cancel-review').addEventListener('click', () => {
        ui.closeReviewModal();
    });

    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        const movieModal = document.getElementById('movie-modal');
        const reviewModal = document.getElementById('review-modal');
        
        if (e.target === movieModal) {
            ui.closeMovieModal();
        }
        
        if (e.target === reviewModal) {
            ui.closeReviewModal();
        }
    });

    // Escape key to close modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const movieModal = document.getElementById('movie-modal');
            const reviewModal = document.getElementById('review-modal');
            
            if (movieModal.style.display === 'block') {
                ui.closeMovieModal();
            }
            
            if (reviewModal.style.display === 'block') {
                ui.closeReviewModal();
            }
        }
    });

    // Handle hero section visibility
    handleHeroVisibility();
}

async function applyFilters() {
    if (ui.currentSection !== 'trending' && ui.currentSection !== 'search') {
        return; // Only apply filters on trending and search
    }
    
    const genreId = document.getElementById('genre-filter').value;
    const sortBy = document.getElementById('sort-filter').value;
    
    ui.showLoading();
    
    try {
        const filters = {
            sort_by: sortBy
        };
        
        if (genreId) {
            filters.with_genres = genreId;
        }
        
        const response = await tmdbApi.discoverMovies(filters);
        ui.currentMovies = response.results;
        ui.displayMovies(ui.currentMovies);
        
        // Update section title
        const genreName = genreId ? ui.genres[genreId] : '';
        const titleSuffix = genreName ? ` - ${genreName}` : '';
        document.getElementById('section-title').textContent = `Discover Movies${titleSuffix}`;
        
    } catch (error) {
        console.error('Failed to apply filters:', error);
        ui.showError('Failed to apply filters');
    }
}

function handleHeroVisibility() {
    const heroSection = document.getElementById('hero-section');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    });
    
    observer.observe(heroSection);
    
    // Hide hero section when not on trending page
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const section = btn.dataset.section;
            if (section === 'trending') {
                heroSection.style.display = 'block';
            } else {
                heroSection.style.display = 'none';
            }
        });
    });
    
    // Hide hero when searching
    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', (e) => {
        if (e.target.value.trim()) {
            heroSection.style.display = 'none';
        } else {
            heroSection.style.display = 'block';
        }
    });
}

// Service Worker for offline functionality (optional enhancement)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
                console.log('SW registered: ', registration);
            })
            .catch((registrationError) => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}

// Error handling for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    ui.showToast('An unexpected error occurred', 'error');
    event.preventDefault();
});

// Handle online/offline status
window.addEventListener('online', () => {
    ui.showToast('Connection restored', 'success');
});

window.addEventListener('offline', () => {
    ui.showToast('You are offline. Some features may not work.', 'warning');
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl+K or Cmd+K to focus search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('search-input').focus();
    }
    
    // Number keys for navigation
    if (e.key >= '1' && e.key <= '3' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const sections = ['trending', 'watchlist', 'rated'];
        const sectionIndex = parseInt(e.key) - 1;
        
        if (sectionIndex < sections.length) {
            const activeElement = document.activeElement;
            if (activeElement.tagName !== 'INPUT' && activeElement.tagName !== 'TEXTAREA') {
                e.preventDefault();
                ui.switchSection(sections[sectionIndex]);
            }
        }
    }
});

// Initialize tooltips or help system
function initializeHelp() {
    // Add keyboard shortcuts help
    const helpButton = document.createElement('button');
    helpButton.innerHTML = '<i class="fas fa-question-circle"></i>';
    helpButton.className = 'help-btn';
    helpButton.title = 'Keyboard Shortcuts: Ctrl+K (Search), 1-3 (Navigation)';
    helpButton.style.cssText = `
        position: fixed;
        bottom: 2rem;
        left: 2rem;
        background: rgba(255, 107, 107, 0.8);
        border: none;
        border-radius: 50%;
        width: 50px;
        height: 50px;
        color: white;
        cursor: pointer;
        font-size: 1.2rem;
        z-index: 1000;
        transition: all 0.3s ease;
    `;
    
    helpButton.addEventListener('mouseenter', () => {
        helpButton.style.background = 'rgba(255, 107, 107, 1)';
        helpButton.style.transform = 'scale(1.1)';
    });
    
    helpButton.addEventListener('mouseleave', () => {
        helpButton.style.background = 'rgba(255, 107, 107, 0.8)';
        helpButton.style.transform = 'scale(1)';
    });
    
    document.body.appendChild(helpButton);
}

// Initialize help after DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeHelp();
});