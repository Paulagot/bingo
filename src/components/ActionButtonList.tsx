import { useDisconnect, useAppKit, useAppKitNetwork  } from '@reown/appkit/react'
import { networks } from '../config'

export const ActionButtonList = () => {
    const { disconnect } = useDisconnect();
    const { open } = useAppKit();
    const { switchNetwork } = useAppKitNetwork();

    const handleDisconnect = async () => {
      try {
        await disconnect();
      } catch (error) {
        console.error("Failed to disconnect:", error);
      }
    };
  return (
    <div >
        <button type="button" onClick={() => open({ view: 'Connect', namespace: 'eip155' })}>Open EVM</button>
        <button type="button"onClick={() => open({ view: 'Connect', namespace: 'solana' })}>Open Solana</button>
        <button type="button" onClick={handleDisconnect}>Disconnect</button>
        <button  type="button"onClick={() => switchNetwork(networks[1]) }>Switch</button>
    </div>
  )
}
