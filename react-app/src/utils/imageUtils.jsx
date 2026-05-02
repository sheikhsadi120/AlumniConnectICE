/**
 * Image handling utility for AlumniConnect React app
 * - Lazy loading with Intersection Observer
 * - Error fallback with placeholder images
 * - Responsive image sizing
 * - Production-ready error handling
 */

import React from 'react';

// Placeholder avatars and images
export const PLACEHOLDER_IMAGES = {
  avatar: 'https://ui-avatars.com/api/?name=User&background=5f2c82&color=fff&size=200&rounded=true',
  profile: 'https://via.placeholder.com/400x400?text=Profile+Photo&font=raleway&bg=f4f0f8&tc=5f2c82',
  idcard: 'https://via.placeholder.com/300x400?text=ID+Card&font=raleway&bg=f4f0f8&tc=5f2c82',
  logo: 'https://via.placeholder.com/200x200?text=Logo&font=raleway&bg=f4f0f8&tc=5f2c82',
  default: 'https://via.placeholder.com/400x400?text=Image&font=raleway&bg=f4f0f8&tc=5f2c82',
};

/**
 * Get a placeholder image URL based on type
 * @param {string} type - 'avatar' | 'profile' | 'idcard' | 'logo' | 'default'
 * @returns {string} Placeholder image URL
 */
export const getPlaceholderUrl = (type = 'default') => {
  return PLACEHOLDER_IMAGES[type] || PLACEHOLDER_IMAGES.default;
};

/**
 * Build a responsive Cloudinary image URL with transformations
 * @param {string} url - Original image URL
 * @param {object} options - Transformation options
 * @returns {string} Transformed URL
 */
export const buildResponsiveImageUrl = (url, options = {}) => {
  if (!url || typeof url !== 'string') return getPlaceholderUrl();
  
  // If not a Cloudinary URL, return as-is
  if (!url.includes('cloudinary.com')) {
    return url;
  }
  
  const { width, height, quality = 'auto', crop = 'fill' } = options;
  
  // Build transformation string
  let transforms = [];
  
  if (width || height) {
    const w = width ? `w_${width}` : '';
    const h = height ? `h_${height}` : '';
    const c = `c_${crop}`;
    transforms.push([w, h, c].filter(Boolean).join(','));
  }
  
  if (quality) {
    transforms.push(`q_${quality}`);
  }
  
  // Insert transformations into URL
  if (transforms.length > 0) {
    const transformString = transforms.join('/');
    return url.replace('/upload/', `/upload/${transformString}/`);
  }
  
  return url;
};

/**
 * React Image Component with lazy loading, error handling, and fallbacks
 * 
 * Usage:
 * <LazyImage 
 *   src={imageUrl} 
 *   alt="description"
 *   type="avatar"
 *   width={64}
 *   height={64}
 * />
 */
export const LazyImage = ({
  src,
  alt = 'Image',
  type = 'default',
  width,
  height,
  className = '',
  style = {},
  onLoad = () => {},
  onError = () => {},
  loading = 'lazy',
  ...props
}) => {
  const [imageSrc, setImageSrc] = React.useState(src || getPlaceholderUrl(type));
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [hasError, setHasError] = React.useState(false);
  const imgRef = React.useRef(null);

  React.useEffect(() => {
    // Update source if prop changes
    if (src && src !== imageSrc) {
      setImageSrc(src);
      setHasError(false);
      setIsLoaded(false);
    }
  }, [src]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad();
  };

  const handleError = () => {
    console.warn(`[Image Error] Failed to load: ${src}`);
    setHasError(true);
    setImageSrc(getPlaceholderUrl(type));
    onError();
  };

  const computedStyle = {
    opacity: isLoaded ? 1 : 0.6,
    transition: 'opacity 0.3s ease-in',
    ...style,
  };

  if (width && height) {
    computedStyle.width = width;
    computedStyle.height = height;
    computedStyle.objectFit = 'cover';
  }

  return (
    <img
      ref={imgRef}
      src={imageSrc}
      alt={alt}
      className={className}
      style={computedStyle}
      loading={loading}
      onLoad={handleLoad}
      onError={handleError}
      decoding="async"
      {...props}
    />
  );
};

/**
 * React Picture component for responsive images with multiple sources
 * Supports srcset for different screen sizes
 */
export const ResponsivePicture = ({
  src,
  alt = 'Image',
  type = 'default',
  className = '',
  style = {},
  breakpoints = {
    mobile: { width: 200, minWidth: 320 },
    tablet: { width: 400, minWidth: 768 },
    desktop: { width: 800, minWidth: 1024 },
  },
  ...props
}) => {
  if (!src || typeof src !== 'string') {
    return (
      <img
        src={getPlaceholderUrl(type)}
        alt={alt}
        className={className}
        style={style}
        {...props}
      />
    );
  }

  // Build srcset for Cloudinary images
  const isCloudinary = src.includes('cloudinary.com');
  
  let srcSet = '';
  if (isCloudinary) {
    const mobileUrl = buildResponsiveImageUrl(src, { 
      width: breakpoints.mobile.width, 
      quality: 'auto' 
    });
    const tabletUrl = buildResponsiveImageUrl(src, { 
      width: breakpoints.tablet.width, 
      quality: 'auto' 
    });
    const desktopUrl = buildResponsiveImageUrl(src, { 
      width: breakpoints.desktop.width, 
      quality: 'auto' 
    });
    
    srcSet = `${mobileUrl} ${breakpoints.mobile.width}w, ${tabletUrl} ${breakpoints.tablet.width}w, ${desktopUrl} ${breakpoints.desktop.width}w`;
  }

  return (
    <picture>
      {srcSet && <source srcSet={srcSet} />}
      <LazyImage
        src={src}
        alt={alt}
        type={type}
        className={className}
        style={style}
        {...props}
      />
    </picture>
  );
};

/**
 * Avatar image component with initials fallback
 */
export const AvatarImage = ({
  src,
  name = 'User',
  size = 64,
  className = '',
  ...props
}) => {
  const [showInitials, setShowInitials] = React.useState(!src);
  const initials = (name || 'U')
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);

  const handleError = () => {
    setShowInitials(true);
  };

  if (showInitials) {
    return (
      <div
        className={`avatar-initials ${className}`}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#5f2c82',
          color: '#fff',
          borderRadius: '50%',
          fontSize: `${size * 0.4}px`,
          fontWeight: 'bold',
          ...props.style,
        }}
      >
        {initials}
      </div>
    );
  }

  return (
    <LazyImage
      src={src || getPlaceholderUrl('avatar')}
      alt={name}
      type="avatar"
      width={size}
      height={size}
      className={`avatar-image ${className}`}
      style={{
        borderRadius: '50%',
        objectFit: 'cover',
        ...props.style,
      }}
      onError={handleError}
      {...props}
    />
  );
};
