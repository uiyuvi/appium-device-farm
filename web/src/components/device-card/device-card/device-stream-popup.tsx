import React from 'react';
import './device-stream-popup.css';

interface IDeviceStreamPopupProps {
  isVisible: boolean;
  onClose: () => void;
  streamUrl?: string;
  deviceName?: string;
}

function DeviceStreamPopup(props: IDeviceStreamPopupProps) {
  const { isVisible, onClose, streamUrl, deviceName } = props;

  return (
    <>
      {isVisible && (
        <div className="device-stream-popup-container">
          <div className="device-stream-popup">
            <div className="device-stream-popup-header">
              <div className="device-stream-popup-header__title">{deviceName}</div>
              <div className="device-stream-popup-header__close" onClick={onClose}>
                &times;
              </div>
            </div>
            <iframe src={`${streamUrl}`} className="device-stream-popup-content__embed" />
          </div>
        </div>
      )}
    </>
  );
}

export default DeviceStreamPopup;
