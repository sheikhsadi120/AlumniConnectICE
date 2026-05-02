/**
 * Clean Profile Image Component
 * 
 * Displays ONLY the actual uploaded image with NO fallback avatars
 * - If image URL exists → show ONLY the image
 * - If image fails to load → show nothing (complete removal)
 * - No overlapping with fallback letters
 * - Proper z-index and positioning
 * 
 * Usage:
 * <ProfileImage 
 *   src={imageUrl}
 *   alt="User name"
 *   width={96}
 *   height={96}
 *   className="custom-class"
 *   onClick={handleClick}
 * />
 */

import React, { useState, useCallback } from 'react';

const ProfileImage = React.forwardRef(({
  src,
  alt = 'Profile',
  width = 96,
  height = 96,
  className = '',
  style = {},
  onClick = null,
  onLoad = null,
  onError = null,
  borderRadius = '50%',
  objectFit = 'cover',
  ...props
}, ref) => {
  // Track if image has failed to load
  const [imageFailed, setImageFailed] = useState(false);

  // Handle image load success
  const handleLoad = useCallback((e) => {
    setImageFailed(false);
    if (onLoad) onLoad(e);
  }, [onLoad]);

  // Handle image load failure - render nothing
  const handleError = useCallback((e) => {
    setImageFailed(true);
    if (onError) onError(e);
  }, [onError]);

  // If no URL or image failed to load, render nothing (not even a div)
  if (!src || imageFailed) {
    return null;
  }

  // Build final styles
  const finalStyle = {
    width,
    height,
    borderRadius,
    objectFit,
    display: 'block',
    flexShrink: 0,
    ...style,
  };

  // Render ONLY the image element (no overlapping div, no fallback text)
  return (
    <img
      ref={ref}
      src={src}
      alt={alt}
      className={className}
      style={finalStyle}
      onLoad={handleLoad}
      onError={handleError}
      onClick={onClick}
      {...props}
    />
  );
});

ProfileImage.displayName = 'ProfileImage';

export default ProfileImage;
