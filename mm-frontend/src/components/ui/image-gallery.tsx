import React, { useState } from 'react';
import { Button } from './button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './dialog';
import { ChevronLeft, ChevronRight, X, ZoomIn } from 'lucide-react';
import { getConfig } from '@/lib/api-client';

interface ImageGalleryProps {
  images: string[];
  postId: string;
  maxDisplay?: number;
  className?: string;
}

export const ImageGallery: React.FC<ImageGalleryProps> = ({
  images,
  postId,
  maxDisplay = 3,
  className = ''
}) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  if (!images || images.length === 0) {
    return null;
  }

  const displayImages = images.slice(0, maxDisplay);
  const remainingCount = images.length - maxDisplay;

  const getImageUrl = (imagePath: string) => {
    // If it's already a full URL, return as is
    if (imagePath.startsWith('http')) {
      return imagePath;
    }

    // If it's a local path, construct the backend URL
    const { apiBaseUrl } = getConfig();
    return `${apiBaseUrl}${imagePath}`;
  };

  const openImageDialog = (index: number) => {
    setSelectedImageIndex(index);
    setIsDialogOpen(true);
  };

  const closeImageDialog = () => {
    setIsDialogOpen(false);
    setSelectedImageIndex(null);
  };

  const navigateImage = (direction: 'prev' | 'next') => {
    if (selectedImageIndex === null) return;

    const newIndex = direction === 'prev'
      ? (selectedImageIndex - 1 + images.length) % images.length
      : (selectedImageIndex + 1) % images.length;

    setSelectedImageIndex(newIndex);
  };

  return (
    <>
      <div className={`flex gap-2 ${className}`}>
        {displayImages.map((image, index) => (
          <div key={index} className="relative group">
            <img
              src={getImageUrl(image)}
              alt={`Post ${postId} image ${index + 1}`}
              className="w-16 h-16 object-cover rounded-lg border cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => openImageDialog(index)}
              onError={(e) => {
                // Hide broken images
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-lg flex items-center justify-center transition-all">
              <ZoomIn className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        ))}

        {remainingCount > 0 && (
          <div
            className="w-16 h-16 bg-muted rounded-lg border flex items-center justify-center cursor-pointer hover:bg-muted/80 transition-colors"
            onClick={() => openImageDialog(maxDisplay)}
          >
            <span className="text-sm font-medium text-muted-foreground">
              +{remainingCount}
            </span>
          </div>
        )}
      </div>

      {/* Image Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="flex items-center justify-between">
              <span>Post Images ({images.length})</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={closeImageDialog}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>

          <div className="relative px-6 pb-6">
            {selectedImageIndex !== null && (
              <>
                <img
                  src={getImageUrl(images[selectedImageIndex])}
                  alt={`Post ${postId} image ${selectedImageIndex + 1}`}
                  className="w-full h-auto max-h-[60vh] object-contain rounded-lg"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/placeholder-image.png';
                  }}
                />

                {images.length > 1 && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="absolute left-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                      onClick={() => navigateImage('prev')}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                      onClick={() => navigateImage('next')}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </>
                )}

                <div className="mt-4 text-center text-sm text-muted-foreground">
                  {selectedImageIndex + 1} of {images.length}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
