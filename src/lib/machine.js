import { createHash } from 'node:crypto';
import os from 'node:os';

/**
 * ID estável da máquina — derivado de hostname + plataforma + arquitetura.
 * Resultado: hex de 32 chars. Mesma máquina = mesmo ID.
 *
 * Não é à prova de fraude (cliente pode mudar hostname e ganhar slot novo),
 * mas resolve o caso comum de "limitar quantos dispositivos por licença".
 */
export function getMachineId() {
  const raw = `${os.hostname()}::${os.platform()}::${os.arch()}`;
  return createHash('sha256').update(raw).digest('hex').slice(0, 32);
}
