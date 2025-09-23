// Local Storage Management
class StorageManager {
    constructor() {
        this.KEYS = {
            RATINGS: 'cineRate_ratings',
            REVIEWS: 'cineRate_reviews',
            WATCHLIST: 'cineRate_watchlist'
        };
    }

    // Generic storage methods
    get(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Error reading from localStorage:', error);
            return null;
        }
    }

    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('Error writing to localStorage:', error);
            return false;
        }
    }

    // Ratings management
    getRatings() {
        return this.get(this.KEYS.RATINGS) || {};
    }

    setRating(movieId, rating) {
        const ratings = this.getRatings();
        ratings[movieId] = {
            rating: rating,
            timestamp: Date.now()
        };
        return this.set(this.KEYS.RATINGS, ratings);
    }

    getRating(movieId) {
        const ratings = this.getRatings();
        return ratings[movieId] ? ratings[movieId].rating : 0;
    }

    removeRating(movieId) {
        const ratings = this.getRatings();
        delete ratings[movieId];
        return this.set(this.KEYS.RATINGS, ratings);
    }

    // Reviews management
    getReviews() {
        return this.get(this.KEYS.REVIEWS) || {};
    }

    setReview(movieId, rating, text) {
        const reviews = this.getReviews();
        const reviewId = Date.now().toString();
        
        if (!reviews[movieId]) {
            reviews[movieId] = [];
        }
        
        reviews[movieId].push({
            id: reviewId,
            rating: rating,
            text: text,
            timestamp: Date.now(),
            date: new Date().toLocaleDateString()
        });
        
        // Also save the rating
        this.setRating(movieId, rating);
        
        return this.set(this.KEYS.REVIEWS, reviews);
    }

    getMovieReviews(movieId) {
        const reviews = this.getReviews();
        return reviews[movieId] || [];
    }

    getAllReviewedMovies() {
        const reviews = this.getReviews();
        const ratings = this.getRatings();
        const reviewedMovies = [];
        
        // Get movies from reviews
        Object.keys(reviews).forEach(movieId => {
            if (reviews[movieId].length > 0) {
                reviewedMovies.push({
                    movieId: parseInt(movieId),
                    hasReview: true,
                    rating: ratings[movieId] ? ratings[movieId].rating : 0,
                    lastReview: reviews[movieId][reviews[movieId].length - 1]
                });
            }
        });
        
        // Get movies with only ratings (no reviews)
        Object.keys(ratings).forEach(movieId => {
            if (!reviews[movieId] || reviews[movieId].length === 0) {
                reviewedMovies.push({
                    movieId: parseInt(movieId),
                    hasReview: false,
                    rating: ratings[movieId].rating,
                    timestamp: ratings[movieId].timestamp
                });
            }
        });
        
        // Sort by timestamp (most recent first)
        return reviewedMovies.sort((a, b) => {
            const timeA = a.lastReview ? a.lastReview.timestamp : a.timestamp;
            const timeB = b.lastReview ? b.lastReview.timestamp : b.timestamp;
            return timeB - timeA;
        });
    }

    // Watchlist management
    getWatchlist() {
        return this.get(this.KEYS.WATCHLIST) || {};
    }

    addToWatchlist(movie) {
        const watchlist = this.getWatchlist();
        watchlist[movie.id] = {
            ...movie,
            addedAt: Date.now()
        };
        return this.set(this.KEYS.WATCHLIST, watchlist);
    }

    removeFromWatchlist(movieId) {
        const watchlist = this.getWatchlist();
        delete watchlist[movieId];
        return this.set(this.KEYS.WATCHLIST, watchlist);
    }

    isInWatchlist(movieId) {
        const watchlist = this.getWatchlist();
        return !!watchlist[movieId];
    }

    getWatchlistMovies() {
        const watchlist = this.getWatchlist();
        return Object.values(watchlist).sort((a, b) => b.addedAt - a.addedAt);
    }

    // Statistics
    getStats() {
        const ratings = this.getRatings();
        const reviews = this.getReviews();
        const watchlist = this.getWatchlist();
        
        const ratedMoviesCount = Object.keys(ratings).length;
        const reviewedMoviesCount = Object.keys(reviews).reduce((count, movieId) => {
            return count + (reviews[movieId].length > 0 ? 1 : 0);
        }, 0);
        const watchlistCount = Object.keys(watchlist).length;
        
        // Calculate average rating
        const ratingValues = Object.values(ratings).map(r => r.rating);
        const averageRating = ratingValues.length > 0 
            ? ratingValues.reduce((sum, rating) => sum + rating, 0) / ratingValues.length 
            : 0;
        
        return {
            ratedMoviesCount,
            reviewedMoviesCount,
            watchlistCount,
            averageRating: Math.round(averageRating * 10) / 10
        };
    }

    // Clear all data
    clearAll() {
        localStorage.removeItem(this.KEYS.RATINGS);
        localStorage.removeItem(this.KEYS.REVIEWS);
        localStorage.removeItem(this.KEYS.WATCHLIST);
    }

    // Export data
    exportData() {
        return {
            ratings: this.getRatings(),
            reviews: this.getReviews(),
            watchlist: this.getWatchlist(),
            exportDate: new Date().toISOString()
        };
    }

    // Import data
    importData(data) {
        try {
            if (data.ratings) this.set(this.KEYS.RATINGS, data.ratings);
            if (data.reviews) this.set(this.KEYS.REVIEWS, data.reviews);
            if (data.watchlist) this.set(this.KEYS.WATCHLIST, data.watchlist);
            return true;
        } catch (error) {
            console.error('Error importing data:', error);
            return false;
        }
    }
}

// Create global instance
const storage = new StorageManager();