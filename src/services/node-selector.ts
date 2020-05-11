import { config } from '../common';
import { ServerToServerService } from './server-to-server';

interface SignatureResponse {
  selectedNode: {
    userId: string;
    licenseId: string;
    machineId: string;
    address: string;
  };
  signature: {
    signature: string;
    nodeHardwareLicenseId: string;
    nonce: string;
  };
}

class NodeSelector extends ServerToServerService {
  baseUrl = `${config.nodeSelectorUrl}`;

  public getNodeToMineTransaction = async () => {
    const jwtAxios = this.getAxios({ role: 'system' });

    const { data } = await jwtAxios.get<SignatureResponse>(
      `${this.baseUrl}/node`,
    );

    return data.signature;
  };
}

export const nodeSelector = new NodeSelector();
export default nodeSelector;
