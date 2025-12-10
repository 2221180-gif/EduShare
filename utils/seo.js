/**
 * SEO Utilities for EduShare Connect
 * Provides functions for generating meta tags, structured data, and SEO-friendly content
 */

/**
 * Generate meta tags for a page
 * @param {Object} options - SEO options
 * @param {string} options.title - Page title
 * @param {string} options.description - Page description
 * @param {string} options.keywords - Page keywords (comma-separated)
 * @param {string} options.image - Open Graph image URL
 * @param {string} options.url - Canonical URL
 * @param {string} options.type - Open Graph type (default: 'website')
 * @returns {Object} Meta tags object
 */
function generateMetaTags(options) {
    const {
        title = 'EduShare Connect - Peer-to-Peer Educational Platform',
        description = 'Join EduShare Connect to share and discover educational resources, connect with learners worldwide, and enhance your learning journey.',
        keywords = 'education, learning, resources, courses, study materials, peer learning, online education, EduShare',
        image = '/images/og-image.png',
        url = '',
        type = 'website',
        author = 'EduShare Connect'
    } = options;

    return {
        title,
        description,
        keywords,
        author,
        // Open Graph tags
        ogTitle: title,
        ogDescription: description,
        ogImage: image,
        ogUrl: url,
        ogType: type,
        ogSiteName: 'EduShare Connect',
        // Twitter Card tags
        twitterCard: 'summary_large_image',
        twitterTitle: title,
        twitterDescription: description,
        twitterImage: image,
        // Canonical URL
        canonical: url
    };
}

/**
 * Generate structured data (JSON-LD) for a page
 * @param {string} type - Schema.org type
 * @param {Object} data - Structured data
 * @returns {string} JSON-LD script content
 */
function generateStructuredData(type, data) {
    const baseData = {
        '@context': 'https://schema.org',
        '@type': type
    };

    return JSON.stringify({ ...baseData, ...data }, null, 2);
}

/**
 * Generate Organization structured data
 * @param {string} siteUrl - Base site URL
 * @returns {string} JSON-LD for organization
 */
function generateOrganizationData(siteUrl) {
    return generateStructuredData('Organization', {
        name: 'EduShare Connect',
        description: 'Peer-to-peer educational platform for sharing knowledge and resources',
        url: siteUrl,
        logo: `${siteUrl}/images/logo.png`,
        sameAs: [
            // Add your social media URLs here
        ]
    });
}

/**
 * Generate Course structured data
 * @param {Object} course - Course object
 * @param {string} siteUrl - Base site URL
 * @returns {string} JSON-LD for course
 */
function generateCourseData(course, siteUrl) {
    return generateStructuredData('Course', {
        name: course.title,
        description: course.description,
        provider: {
            '@type': 'Organization',
            name: 'EduShare Connect',
            url: siteUrl
        },
        url: `${siteUrl}/courses/${course._id}`
    });
}

/**
 * Generate Article structured data for resources
 * @param {Object} resource - Resource object
 * @param {string} siteUrl - Base site URL
 * @returns {string} JSON-LD for article
 */
function generateArticleData(resource, siteUrl) {
    return generateStructuredData('Article', {
        headline: resource.title,
        description: resource.description,
        author: {
            '@type': 'Person',
            name: resource.uploadedBy?.username || 'Anonymous'
        },
        datePublished: resource.createdAt,
        publisher: {
            '@type': 'Organization',
            name: 'EduShare Connect',
            logo: {
                '@type': 'ImageObject',
                url: `${siteUrl}/images/logo.png`
            }
        },
        url: `${siteUrl}/resources/${resource._id}`
    });
}

/**
 * SEO Middleware - Attach SEO helper to response object
 */
function seoMiddleware(req, res, next) {
    // Get base URL from environment or construct from request
    const baseUrl = process.env.SITE_URL || `${req.protocol}://${req.get('host')}`;

    // Attach SEO helper to response locals
    res.locals.seo = {
        baseUrl,
        generateMetaTags: (options) => generateMetaTags({ ...options, url: options.url || `${baseUrl}${req.originalUrl}` }),
        generateStructuredData,
        generateOrganizationData: () => generateOrganizationData(baseUrl),
        generateCourseData: (course) => generateCourseData(course, baseUrl),
        generateArticleData: (resource) => generateArticleData(resource, baseUrl)
    };

    next();
}

module.exports = {
    generateMetaTags,
    generateStructuredData,
    generateOrganizationData,
    generateCourseData,
    generateArticleData,
    seoMiddleware
};
