// @ts-ignore;
import React, { useRef } from 'react';
// @ts-ignore;
import { Button } from '@/components/ui';
// @ts-ignore;
import { Camera, Image, Upload } from 'lucide-react';

const MobileUpload = ({
  onFilesSelected,
  accept = "image/*"
}) => {
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  // 处理文件选择
  const handleFileSelect = event => {
    const files = Array.from(event.target.files);
    if (files.length > 0) {
      onFilesSelected(files);
    }
    // 重置input值，允许重复选择相同文件
    event.target.value = '';
  };

  // 触发文件选择
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // 触发相机拍照
  const triggerCamera = () => {
    cameraInputRef.current?.click();
  };
  return <div className="space-y-4">
      {/* 隐藏的文件输入 */}
      <input ref={fileInputRef} type="file" accept={accept} multiple onChange={handleFileSelect} className="hidden" />
      
      {/* 隐藏的相机输入 */}
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileSelect} className="hidden" />

      {/* 移动端上传按钮组 */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* 拍照上传 */}
        <Button type="button" onClick={triggerCamera} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
          <Camera className="w-4 h-4 mr-2" />
          拍照上传
        </Button>

        {/* 相册选择 */}
        <Button type="button" onClick={triggerFileInput} className="flex-1 bg-green-600 hover:bg-green-700 text-white">
          <Image className="w-4 h-4 mr-2" />
          相册选择
        </Button>
      </div>

      {/* 桌面端兼容性提示 */}
      <div className="text-xs text-gray-500 text-center">
        在移动设备上可分别使用拍照和相册功能
      </div>
    </div>;
};
export default MobileUpload;