'use client';

import { useState, useRef } from 'react';
import { Upload, X, FileText, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

interface FileUploadProps {
  bucket?: string;
  path?: string;
  onUploadComplete: (url: string) => void;
  allowedTypes?: string[];
  maxSize?: number; // in MB
}

export function FileUpload({
  bucket = 'medical-files',
  path = 'uploads',
  onUploadComplete,
  allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'],
  maxSize = 10,
}: FileUploadProps) {
  const { clinicId } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; url: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const supabase = createClient();

  const handleUpload = async (file: File) => {
    if (!clinicId) {
      setError('يجب تسجيل الدخول لرفع الملفات');
      return;
    }

    // Validations
    if (!allowedTypes.includes(file.type)) {
      setError('نوع الملف غير مدعوم');
      return;
    }

    if (file.size > maxSize * 1024 * 1024) {
      setError(`حجم الملف يجب أن يكون أقل من ${maxSize} ميجابايت`);
      return;
    }

    setError(null);
    setIsUploading(true);
    setProgress(0);

    const fileExt = file.name.split('.').pop();
    const fileName = `${clinicId}/${path}/${Date.now()}.${fileExt}`;

    try {
      const { data, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      setUploadedFile({ name: file.name, url: publicUrl });
      onUploadComplete(publicUrl);
      setProgress(100);
    } catch (err: any) {
      setError(err.message || 'فشل رفع الملف');
    } finally {
      setIsUploading(false);
    }
  };

  const clearFile = () => {
    setUploadedFile(null);
    setError(null);
    setProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-4">
      {!uploadedFile ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "group relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/25 p-8 transition-all hover:border-primary/50 cursor-pointer",
            isUploading && "pointer-events-none opacity-60"
          )}
        >
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUpload(file);
            }}
          />
          
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary transition-transform group-hover:scale-110">
            {isUploading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <Upload className="h-6 w-6" />
            )}
          </div>

          <div className="mt-4 text-center">
            <p className="text-sm font-medium">اسحب الملف هنا أو انقر للاختيار</p>
            <p className="mt-1 text-xs text-muted-foreground">
              PDF, JPG, PNG (حد أقصى {maxSize} ميجابايت)
            </p>
          </div>

          {isUploading && (
            <div className="absolute inset-x-8 bottom-4">
              <Progress value={progress} className="h-1" />
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between rounded-xl border bg-card p-4 animate-in fade-in zoom-in duration-200">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/20">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium truncate max-w-[200px]">{uploadedFile.name}</p>
              <div className="flex items-center gap-1 text-xs text-emerald-600">
                <CheckCircle className="h-3 w-3" />
                تم الرفع بنجاح
              </div>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={clearFile}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-xs text-destructive animate-in slide-in-from-top-1 duration-200">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}
    </div>
  );
}
