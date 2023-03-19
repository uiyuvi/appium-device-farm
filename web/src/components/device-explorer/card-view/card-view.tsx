import React from 'react';
import { IDevice } from '../../../interfaces/IDevice';
import DeviceCard from '../../device-card/device-card/device-card';
import DeviceStreamPopup from '../../device-popup/device-stream-popup';
import './card-view.css';

interface IProps {
  devices: Array<IDevice>;
  reloadDevices: () => void;
}

export default class CardView extends React.Component<IProps, any> {
  constructor(props: any) {
    super(props);
    this.state = {
      streamingDevice: {
        isVisible: false,
        devices: [],
      },
    };
  }

  streamDevice = (device?: IDevice) => {
    if (device) {
      this.setState({
        streamingDevice: {
          isVisible: true,
          devices: [device],
        },
      });
    } else {
      this.setState({
        streamingDevice: {
          isVisible: false,
          devices: [],
        },
      });
    }
  };

  render() {
    return (
      <>
        <div className="device-explorer-card-container">
          {React.Children.toArray(
            this.props.devices.map((device, i) => (
              <DeviceCard
                device={device}
                reloadDevices={this.props.reloadDevices}
                streamDevice={this.streamDevice}
              />
            ))
          )}
        </div>
        {this.state.streamingDevice.isVisible && (
          <DeviceStreamPopup
            devices={this.state.streamingDevice.devices}
            onClose={() => this.streamDevice()}
          />
        )}
      </>
    );
  }
}
