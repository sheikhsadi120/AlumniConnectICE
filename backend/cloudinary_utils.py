"""
Cloudinary integration for reliable image storage across all deployments.
Handles upload, retrieval, and URL building for production-grade image management.
"""

import os
import cloudinary
import cloudinary.uploader
from cloudinary.utils import cloudinary_url
import config


# Initialize Cloudinary with environment variables
CLOUDINARY_CLOUD_NAME = os.getenv('CLOUDINARY_CLOUD_NAME', '').strip()
CLOUDINARY_API_KEY = os.getenv('CLOUDINARY_API_KEY', '').strip()
CLOUDINARY_API_SECRET = os.getenv('CLOUDINARY_API_SECRET', '').strip()

CLOUDINARY_ENABLED = bool(CLOUDINARY_CLOUD_NAME and CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET)

if CLOUDINARY_ENABLED:
    cloudinary.config(
        cloud_name=CLOUDINARY_CLOUD_NAME,
        api_key=CLOUDINARY_API_KEY,
        api_secret=CLOUDINARY_API_SECRET,
    )


def is_cloudinary_configured():
    """Check if Cloudinary is properly configured."""
    return CLOUDINARY_ENABLED


def upload_to_cloudinary(file_stream, filename=None, folder='alumniconnect'):
    """
    Upload file to Cloudinary.
    
    Args:
        file_stream: File object or binary data
        filename: Original filename (used for metadata)
        folder: Cloudinary folder path
    
    Returns:
        dict with 'secure_url', 'public_id', 'error' (if any)
    """
    if not CLOUDINARY_ENABLED:
        return {'error': 'Cloudinary not configured'}
    
    try:
        # Read file data if it's a file object
        if hasattr(file_stream, 'read'):
            file_data = file_stream.read()
            file_stream.seek(0)  # Reset for potential re-read
        else:
            file_data = file_stream
        
        # Upload to Cloudinary
        result = cloudinary.uploader.upload(
            file_data,
            folder=folder,
            resource_type='auto',
            overwrite=False,
            unique_filename=True,
            tags=['alumniconnect'],
        )
        
        return {
            'secure_url': result.get('secure_url'),
            'public_id': result.get('public_id'),
            'url': result.get('secure_url'),
        }
    except Exception as e:
        print(f"[CLOUDINARY] Upload error: {e}")
        return {'error': str(e)}


def build_cloudinary_url(public_id, width=None, height=None, quality='auto'):
    """
    Build a Cloudinary image URL with optional transformations.
    
    Args:
        public_id: Cloudinary public ID
        width: Optional image width for responsive sizing
        height: Optional image height
        quality: Image quality (default: auto)
    
    Returns:
        Full Cloudinary URL with transformations
    """
    if not public_id or not CLOUDINARY_ENABLED:
        return None
    
    try:
        # Build transformation parameters
        transformations = []
        if width or height:
            t = {}
            if width:
                t['width'] = int(width)
            if height:
                t['height'] = int(height)
            t['crop'] = 'fill'
            transformations.append(t)
        
        if quality:
            transformations.append({'quality': quality})
        
        # Generate URL
        url, _ = cloudinary_url(
            public_id,
            secure=True,
            transformation=transformations if transformations else None,
        )
        
        return url
    except Exception as e:
        print(f"[CLOUDINARY] URL build error: {e}")
        return None


def get_fallback_avatar_url():
    """Return a public placeholder avatar image URL."""
    # Using a reliable public placeholder service as fallback
    return 'https://ui-avatars.com/api/?name=User&background=5f2c82&color=fff&size=200'


def get_fallback_image_url(type_name='image'):
    """Return a placeholder image URL for missing images."""
    placeholders = {
        'avatar': 'https://ui-avatars.com/api/?name=User&background=5f2c82&color=fff&size=200',
        'id_card': 'https://via.placeholder.com/300x400?text=ID+Card',
        'logo': 'https://via.placeholder.com/200x200?text=Logo',
        'profile': 'https://via.placeholder.com/400x400?text=Profile+Photo',
    }
    return placeholders.get(type_name, placeholders['profile'])
