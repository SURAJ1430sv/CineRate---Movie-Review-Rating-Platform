// UI Components and Helpers
class UIComponents {
    constructor() {
        this.currentMovieId = null;
        this.currentSection = 'trending';
        this.currentPage = 1;
        this.currentMovies = [];
        this.genres = {};
    }

    // Initialize genres
    async initializeGenres() {
        try {
            const response = await tmdbApi.getGenres();
            this.genres = response.genres.reduce((acc, genre) => {
                acc[genre.id] = genre.name;
                return acc;
            }, {});
            
            // Populate genre filter
            this.populateGenreFilter();
        } catch (error) {
            console.error('Failed to load genres:', error);
        }
    }

    // Populate genre filter dropdown
    populateGenreFilter() {
        const genreFilter = document.getElementById('genre-filter');
        if (!genreFilter) return;

        // Clear existing options except the first one
        while (genreFilter.children.length > 1) {
            genreFilter.removeChild(genreFilter.lastChild);
        }

        // Add genre options
        Object.entries(this.genres).forEach(([id, name]) => {
            const option = document.createElement('option');
            option.value = id;
            option.textContent = name;
            genreFilter.appendChild(option);
        });
    }

    // Create movie card HTML
    createMovieCard(movie) {
        const userRating = storage.getRating(movie.id);
        const isInWatchlist = storage.isInWatchlist(movie.id);
        
        return `
            <div class="movie-card" data-movie-id="${movie.id}" tabindex="0">
                <div class="movie-poster">
                    <img src="${tmdbApi.getImageUrl(movie.poster_path)}" 
                         alt="${movie.title}" 
                         loading="lazy">
                    <div class="movie-rating">
                        <i class="fas fa-star"></i>
                        ${movie.vote_average.toFixed(1)}
                    </div>
                </div>
                <div class="movie-info">
                    <h3 class="movie-title">${movie.title}</h3>
                    <p class="movie-year">${new Date(movie.release_date).getFullYear() || 'N/A'}</p>
                    <p class="movie-overview">${movie.overview || 'No overview available.'}</p>
                    <div class="user-rating">
                        <div class="star-rating" data-movie-id="${movie.id}">
                            ${this.createStarRating(userRating)}
                        </div>
                        <button class="rate-btn" onclick="ui.openReviewModal(${movie.id})">
                            ${userRating > 0 ? 'Edit' : 'Rate'}
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    // Create star rating HTML
    createStarRating(rating = 0) {
        let stars = '';
        for (let i = 1; i <= 5; i++) {
            const filled = i <= rating ? 'fas' : 'far';
            stars += `<i class="${filled} fa-star" data-rating="${i}"></i>`;
        }
        return stars;
    }

    // Display movies in grid
    displayMovies(movies) {
        const container = document.getElementById('movies-container');
        const loading = document.getElementById('loading');
        const emptyState = document.getElementById('empty-state');
        
        loading.style.display = 'none';
        
        if (!movies || movies.length === 0) {
            container.innerHTML = '';
            emptyState.style.display = 'block';
            return;
        }
        
        emptyState.style.display = 'none';
        container.innerHTML = movies.map(movie => this.createMovieCard(movie)).join('');
        
        // Add click listeners to movie cards
        this.attachMovieCardListeners();
        
        // Add star rating listeners
        this.attachStarRatingListeners();
    }

    // Attach listeners to movie cards
    attachMovieCardListeners() {
        const movieCards = document.querySelectorAll('.movie-card');
        movieCards.forEach(card => {
            const movieId = parseInt(card.dataset.movieId);
            card.addEventListener('click', (e) => {
                // Don't open modal if clicking on interactive elements
                if (e.target.closest('.star-rating, .rate-btn')) return;
                this.openMovieModal(movieId);
            });
            
            // Keyboard accessibility
            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.openMovieModal(movieId);
                }
            });
        });
    }

    // Attach listeners to star ratings
    attachStarRatingListeners() {
        const starRatings = document.querySelectorAll('.star-rating');
        starRatings.forEach(rating => {
            const movieId = parseInt(rating.dataset.movieId);
            const stars = rating.querySelectorAll('.fa-star');
            
            stars.forEach((star, index) => {
                star.addEventListener('mouseenter', () => {
                    this.highlightStars(stars, index + 1);
                });
                
                star.addEventListener('mouseleave', () => {
                    const currentRating = storage.getRating(movieId);
                    this.highlightStars(stars, currentRating);
                });
                
                star.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const newRating = index + 1;
                    storage.setRating(movieId, newRating);
                    this.highlightStars(stars, newRating);
                    this.showToast(`Rated ${newRating} star${newRating !== 1 ? 's' : ''}!`);
                });
            });
        });
    }

    // Highlight stars for rating
    highlightStars(stars, rating) {
        stars.forEach((star, index) => {
            if (index < rating) {
                star.classList.remove('far');
                star.classList.add('fas');
            } else {
                star.classList.remove('fas');
                star.classList.add('far');
            }
        });
    }

    // Open movie detail modal
    async openMovieModal(movieId) {
        const modal = document.getElementById('movie-modal');
        const modalContent = modal.querySelector('.movie-detail');
        
        this.currentMovieId = movieId;
        modal.style.display = 'block';
        modalContent.innerHTML = '<div class="loading"><div class="spinner"></div><p>Loading movie details...</p></div>';
        
        try {
            const movie = await tmdbApi.getMovieDetails(movieId);
            modalContent.innerHTML = this.createMovieDetailHTML(movie);
            this.attachModalListeners();
        } catch (error) {
            console.error('Failed to load movie details:', error);
            modalContent.innerHTML = `
                <div class="error">
                    <h3>Error Loading Movie</h3>
                    <p>Failed to load movie details. Please try again.</p>
                </div>
            `;
        }
    }

    // Create movie detail HTML
    createMovieDetailHTML(movie) {
        const userRating = storage.getRating(movie.id);
        const isInWatchlist = storage.isInWatchlist(movie.id);
        const reviews = storage.getMovieReviews(movie.id);
        
        // Get trailer
        const trailer = movie.videos?.results?.find(video => 
            video.type === 'Trailer' && video.site === 'YouTube'
        );
        
        // Get main cast (first 6)
        const mainCast = movie.credits?.cast?.slice(0, 6) || [];
        
        return `
            <div class="detail-header">
                <div class="detail-poster">
                    <img src="${tmdbApi.getImageUrl(movie.poster_path)}" 
                         alt="${movie.title}">
                </div>
                <div class="detail-info">
                    <h2 class="detail-title">${movie.title}</h2>
                    <div class="detail-meta">
                        <span>${new Date(movie.release_date).getFullYear()}</span>
                        <span>${tmdbApi.formatRuntime(movie.runtime)}</span>
                        <span>${movie.genres?.map(g => g.name).join(', ') || 'N/A'}</span>
                    </div>
                    <div class="detail-rating">
                        <i class="fas fa-star"></i>
                        <span class="rating-score">${movie.vote_average.toFixed(1)}</span>
                        <span>/10 (${movie.vote_count.toLocaleString()} votes)</span>
                    </div>
                    <div class="user-rating">
                        <label>Your Rating:</label>
                        <div class="star-rating" data-movie-id="${movie.id}">
                            ${this.createStarRating(userRating)}
                        </div>
                    </div>
                    <p class="detail-overview">${movie.overview || 'No overview available.'}</p>
                    <div class="detail-actions">
                        <button class="btn btn-primary" onclick="ui.openReviewModal(${movie.id})">
                            <i class="fas fa-edit"></i>
                            ${storage.getMovieReviews(movie.id).length > 0 ? 'Edit Review' : 'Write Review'}
                        </button>
                        <button class="btn ${isInWatchlist ? 'btn-primary' : 'btn-secondary'}" 
                                onclick="ui.toggleWatchlist(${movie.id})">
                            <i class="fas ${isInWatchlist ? 'fa-check' : 'fa-plus'}"></i>
                            ${isInWatchlist ? 'In Watchlist' : 'Add to Watchlist'}
                        </button>
                        ${trailer ? `
                            <button class="btn btn-secondary" onclick="window.open('${tmdbApi.getYouTubeUrl(trailer.key)}', '_blank')">
                                <i class="fas fa-play"></i>
                                Watch Trailer
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
            
            ${mainCast.length > 0 ? `
                <div class="detail-cast">
                    <h3>Cast</h3>
                    <div class="cast-grid">
                        ${mainCast.map(person => `
                            <div class="cast-member">
                                <img src="${tmdbApi.getImageUrl(person.profile_path)}" 
                                     alt="${person.name}">
                                <div class="cast-name">${person.name}</div>
                                <div class="cast-character">${person.character}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
            
            ${reviews.length > 0 ? `
                <div class="user-reviews">
                    <h3>Your Reviews</h3>
                    ${reviews.map(review => `
                        <div class="review-item">
                            <div class="review-header">
                                <div class="review-rating">
                                    ${this.createStarRating(review.rating)}
                                </div>
                                <div class="review-date">${review.date}</div>
                            </div>
                            <p class="review-text">${review.text}</p>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
        `;
    }

    // Attach modal listeners
    attachModalListeners() {
        // Re-attach star rating listeners for modal
        this.attachStarRatingListeners();
    }

    // Open review modal
    async openReviewModal(movieId) {
        const modal = document.getElementById('review-modal');
        const movieInfo = document.getElementById('review-movie-info');
        const ratingStars = document.getElementById('review-rating');
        const reviewText = document.getElementById('review-text');
        
        this.currentMovieId = movieId;
        
        // Get existing review/rating
        const existingRating = storage.getRating(movieId);
        const existingReviews = storage.getMovieReviews(movieId);
        const existingReview = existingReviews.length > 0 ? existingReviews[existingReviews.length - 1] : null;
        
        // Get movie data (from cache or API)
        let movie;
        try {
            movie = await tmdbApi.getMovieDetails(movieId);
        } catch (error) {
            movie = this.currentMovies.find(m => m.id === movieId) || { title: 'Unknown Movie', poster_path: null };
        }
        
        // Populate movie info
        movieInfo.innerHTML = `
            <img src="${tmdbApi.getImageUrl(movie.poster_path)}" alt="${movie.title}">
            <div>
                <h4>${movie.title}</h4>
                <p>${movie.release_date ? new Date(movie.release_date).getFullYear() : 'N/A'}</p>
            </div>
        `;
        
        // Set existing rating
        const stars = ratingStars.querySelectorAll('.fa-star');
        this.highlightStars(stars, existingRating);
        
        // Set existing review text
        reviewText.value = existingReview ? existingReview.text : '';
        
        modal.style.display = 'block';
        
        // Attach review rating listeners
        this.attachReviewRatingListeners();
    }

    // Attach review rating listeners
    attachReviewRatingListeners() {
        const ratingStars = document.getElementById('review-rating');
        const stars = ratingStars.querySelectorAll('.fa-star');
        let selectedRating = storage.getRating(this.currentMovieId);
        
        stars.forEach((star, index) => {
            star.addEventListener('mouseenter', () => {
                this.highlightStars(stars, index + 1);
            });
            
            star.addEventListener('mouseleave', () => {
                this.highlightStars(stars, selectedRating);
            });
            
            star.addEventListener('click', () => {
                selectedRating = index + 1;
                this.highlightStars(stars, selectedRating);
            });
        });
        
        // Submit review
        document.getElementById('submit-review').onclick = () => {
            if (selectedRating === 0) {
                this.showToast('Please select a rating');
                return;
            }
            
            const reviewText = document.getElementById('review-text').value.trim();
            
            if (reviewText) {
                storage.setReview(this.currentMovieId, selectedRating, reviewText);
                this.showToast('Review saved successfully!');
            } else {
                storage.setRating(this.currentMovieId, selectedRating);
                this.showToast('Rating saved successfully!');
            }
            
            this.closeReviewModal();
            
            // Refresh current view
            this.refreshCurrentView();
        };
    }

    // Toggle watchlist
    async toggleWatchlist(movieId) {
        const isInWatchlist = storage.isInWatchlist(movieId);
        
        if (isInWatchlist) {
            storage.removeFromWatchlist(movieId);
            this.showToast('Removed from watchlist');
        } else {
            // Get movie data
            let movie;
            try {
                movie = await tmdbApi.getMovieDetails(movieId);
            } catch (error) {
                movie = this.currentMovies.find(m => m.id === movieId);
            }
            
            if (movie) {
                storage.addToWatchlist(movie);
                this.showToast('Added to watchlist');
            }
        }
        
        // Refresh current view if we're on watchlist
        if (this.currentSection === 'watchlist') {
            this.loadWatchlist();
        }
        
        // Update modal if it's open
        if (this.currentMovieId === movieId) {
            const watchlistBtn = document.querySelector(`button[onclick="ui.toggleWatchlist(${movieId})"]`);
            if (watchlistBtn) {
                const isInWatchlistNow = storage.isInWatchlist(movieId);
                watchlistBtn.className = `btn ${isInWatchlistNow ? 'btn-primary' : 'btn-secondary'}`;
                watchlistBtn.innerHTML = `
                    <i class="fas ${isInWatchlistNow ? 'fa-check' : 'fa-plus'}"></i>
                    ${isInWatchlistNow ? 'In Watchlist' : 'Add to Watchlist'}
                `;
            }
        }
    }

    // Close modals
    closeMovieModal() {
        document.getElementById('movie-modal').style.display = 'none';
        this.currentMovieId = null;
    }

    closeReviewModal() {
        document.getElementById('review-modal').style.display = 'none';
    }

    // Show toast notification
    showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast show ${type}`;
        
        setTimeout(() => {
            toast.className = 'toast';
        }, 3000);
    }

    // Load different sections
    async loadTrendingMovies() {
        this.showLoading();
        this.currentSection = 'trending';
        document.getElementById('section-title').textContent = 'Trending Movies';
        
        try {
            const response = await tmdbApi.getTrendingMovies();
            this.currentMovies = response.results;
            this.displayMovies(this.currentMovies);
        } catch (error) {
            this.showError('Failed to load trending movies');
        }
    }

    async loadWatchlist() {
        this.currentSection = 'watchlist';
        document.getElementById('section-title').textContent = 'My Watchlist';
        
        const watchlistMovies = storage.getWatchlistMovies();
        this.currentMovies = watchlistMovies;
        this.displayMovies(watchlistMovies);
    }

    async loadRatedMovies() {
        this.currentSection = 'rated';
        document.getElementById('section-title').textContent = 'My Rated Movies';
        
        const ratedMovies = storage.getAllReviewedMovies();
        
        if (ratedMovies.length === 0) {
            this.displayMovies([]);
            return;
        }
        
        // Fetch movie details for rated movies
        this.showLoading();
        try {
            const moviePromises = ratedMovies.map(async (ratedMovie) => {
                try {
                    return await tmdbApi.getMovieDetails(ratedMovie.movieId);
                } catch (error) {
                    return null;
                }
            });
            
            const movies = await Promise.all(moviePromises);
            this.currentMovies = movies.filter(movie => movie !== null);
            this.displayMovies(this.currentMovies);
        } catch (error) {
            this.showError('Failed to load rated movies');
        }
    }

    // Search movies
    async searchMovies(query) {
        if (!query.trim()) {
            this.loadTrendingMovies();
            return;
        }
        
        this.showLoading();
        this.currentSection = 'search';
        document.getElementById('section-title').textContent = `Search Results for "${query}"`;
        
        try {
            const response = await tmdbApi.searchMovies(query);
            this.currentMovies = response.results;
            this.displayMovies(this.currentMovies);
        } catch (error) {
            this.showError('Failed to search movies');
        }
    }

    // Show loading
    showLoading() {
        document.getElementById('loading').style.display = 'flex';
        document.getElementById('movies-container').innerHTML = '';
        document.getElementById('empty-state').style.display = 'none';
    }

    // Show error
    showError(message) {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('movies-container').innerHTML = '';
        document.getElementById('empty-state').innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            <h3>Error</h3>
            <p>${message}</p>
        `;
        document.getElementById('empty-state').style.display = 'block';
    }

    // Refresh current view
    refreshCurrentView() {
        switch (this.currentSection) {
            case 'trending':
                this.loadTrendingMovies();
                break;
            case 'watchlist':
                this.loadWatchlist();
                break;
            case 'rated':
                this.loadRatedMovies();
                break;
            case 'search':
                const searchQuery = document.getElementById('search-input').value;
                if (searchQuery.trim()) {
                    this.searchMovies(searchQuery);
                }
                break;
        }
    }

    // Handle section navigation
    switchSection(section) {
        // Update active nav button
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-section="${section}"]`).classList.add('active');
        
        // Load appropriate content
        switch (section) {
            case 'trending':
                this.loadTrendingMovies();
                break;
            case 'watchlist':
                this.loadWatchlist();
                break;
            case 'rated':
                this.loadRatedMovies();
                break;
        }
    }
}

// Create global instance
const ui = new UIComponents();