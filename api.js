// TMDB API Configuration and Methods
class TMDBApi {
    constructor() {
        // Using a demo API key - replace with your own TMDB API key
        this.API_KEY = '55957fcf3ba81b137f8fc01ac5a31fb5';
        this.BASE_URL = 'https://api.themoviedb.org/3';
        this.IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
        this.BACKDROP_BASE_URL = 'https://image.tmdb.org/t/p/w1280';
        
        // Cache for API responses
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    }

    // Generic API request method
    async makeRequest(endpoint, params = {}) {
        const url = new URL(`${this.BASE_URL}${endpoint}`);
        url.searchParams.append('api_key', this.API_KEY);
        
        // Add additional parameters
        Object.keys(params).forEach(key => {
            if (params[key]) {
                url.searchParams.append(key, params[key]);
            }
        });

        const cacheKey = url.toString();
        
        // Check cache first
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                return cached.data;
            }
        }

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Cache the response
            this.cache.set(cacheKey, {
                data: data,
                timestamp: Date.now()
            });
            
            return data;
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    // Get trending movies
    async getTrendingMovies(timeWindow = 'week') {
        return this.makeRequest(`/trending/movie/${timeWindow}`);
    }

    // Search movies
    async searchMovies(query, page = 1) {
        return this.makeRequest('/search/movie', {
            query: query,
            page: page,
            include_adult: false
        });
    }

    // Get movie details
    async getMovieDetails(movieId) {
        return this.makeRequest(`/movie/${movieId}`, {
            append_to_response: 'credits,videos,reviews,similar'
        });
    }

    // Get popular movies
    async getPopularMovies(page = 1) {
        return this.makeRequest('/movie/popular', { page });
    }

    // Get top rated movies
    async getTopRatedMovies(page = 1) {
        return this.makeRequest('/movie/top_rated', { page });
    }

    // Get now playing movies
    async getNowPlayingMovies(page = 1) {
        return this.makeRequest('/movie/now_playing', { page });
    }

    // Get upcoming movies
    async getUpcomingMovies(page = 1) {
        return this.makeRequest('/movie/upcoming', { page });
    }

    // Discover movies with filters
    async discoverMovies(filters = {}) {
        const defaultFilters = {
            page: 1,
            sort_by: 'popularity.desc',
            include_adult: false,
            include_video: false
        };
        
        return this.makeRequest('/discover/movie', { ...defaultFilters, ...filters });
    }

    // Get movie genres
    async getGenres() {
        return this.makeRequest('/genre/movie/list');
    }

    // Get person details (for cast information)
    async getPersonDetails(personId) {
        return this.makeRequest(`/person/${personId}`);
    }

    // Get movie videos (trailers, etc.)
    async getMovieVideos(movieId) {
        return this.makeRequest(`/movie/${movieId}/videos`);
    }

    // Get movie credits
    async getMovieCredits(movieId) {
        return this.makeRequest(`/movie/${movieId}/credits`);
    }

    // Get movie reviews
    async getMovieReviews(movieId, page = 1) {
        return this.makeRequest(`/movie/${movieId}/reviews`, { page });
    }

    // Get similar movies
    async getSimilarMovies(movieId, page = 1) {
        return this.makeRequest(`/movie/${movieId}/similar`, { page });
    }

    // Utility methods
    getImageUrl(path, size = 'w500') {
        if (!path) return 'https://via.placeholder.com/500x750/1a1a2e/ffffff?text=No+Image';
        return `https://image.tmdb.org/t/p/${size}${path}`;
    }

    getBackdropUrl(path, size = 'w1280') {
        if (!path) return 'https://via.placeholder.com/1280x720/1a1a2e/ffffff?text=No+Backdrop';
        return `https://image.tmdb.org/t/p/${size}${path}`;
    }

    // Get YouTube thumbnail URL
    getYouTubeThumbnail(videoKey) {
        return `https://img.youtube.com/vi/${videoKey}/maxresdefault.jpg`;
    }

    // Get YouTube video URL
    getYouTubeUrl(videoKey) {
        return `https://www.youtube.com/watch?v=${videoKey}`;
    }

    // Format runtime
    formatRuntime(minutes) {
        if (!minutes) return 'N/A';
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}m`;
    }

    // Format release date
    formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    // Format currency
    formatCurrency(amount) {
        if (!amount) return 'N/A';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    }

    // Clean cache periodically
    cleanCache() {
        const now = Date.now();
        for (const [key, value] of this.cache.entries()) {
            if (now - value.timestamp >= this.cacheTimeout) {
                this.cache.delete(key);
            }
        }
    }

    // Clear all cache
    clearCache() {
        this.cache.clear();
    }
}

// Create global instance
const tmdbApi = new TMDBApi();

// Clean cache every 10 minutes
setInterval(() => {
    tmdbApi.cleanCache();
}, 10 * 60 * 1000);