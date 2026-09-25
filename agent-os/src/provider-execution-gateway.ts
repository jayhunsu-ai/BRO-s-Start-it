// Agent OS — provider execution gateway
//
// This is the execution boundary between Agent OS authority and a Blocks-compatible
// ProviderAdapter. A provider turn may only start after a pre-existing CostController
// reservation has been authorized by the Blocks cost gate.
//
// This module does not import Blocks. The adapter contract is vendored in contracts.ts
// and createBlocksCostGate() supplies the runtime enforcement boundary.

import type { ProviderAdapter, SendTurnInput, TurnStartResult } from "./contracts.js";
import type { BlocksCostGate } from "./blocks-cost-gate.js";

export interface ProviderExecutionGateway {
  sendTurn(input: SendTurnInput & {
    costReservationId: string;
    projectId?: string;
    taskId?: string;
  }): Promise<TurnStartResult>;
}

export function createProviderExecutionGateway(
  adapter: ProviderAdapter,
  costGate: BlocksCostGate,
): ProviderExecutionGateway {
  return {
    async sendTurn(input) {
      const { costReservationId, projectId, taskId, ...turnInput } = input;

      await costGate.authorize({
        reservationId: costReservationId,
        provider: adapter.provider,
        model: turnInput.model ?? "unknown",
        projectId,
        taskId,
      });

      let settled = false;
      let unsubscribe: (() => void) | undefined;

      const settleOnce = async (
        result: "ok" | "error",
        actualCostUsd: number | null,
      ) => {
        if (settled) return;
        settled = true;
        unsubscribe?.();
        await costGate.settle({
          reservationId: costReservationId,
          provider: adapter.provider,
          model: turnInput.model ?? "unknown",
          actualCostUsd,
          result,
        });
      };

      unsubscribe = adapter.onEvent((event) => {
        if (event.turnId !== undefined && event.turnId !== turnInput.resumeCursor) {
          // The adapter event stream is shared. The precise turn ID is installed
          // below once sendTurn returns, so events are filtered after that point.
          return;
        }
      });

      try {
        const result = await adapter.sendTurn(turnInput);

        // Replace the pre-send listener with a turn-specific listener now that
        // Blocks has assigned the actual turn ID.
        unsubscribe?.();
        unsubscribe = adapter.onEvent((event) => {
          if (event.turnId !== result.turnId || event.type !== "turn.completed") return;
          void settleOnce(
            event.ok ? "ok" : "error",
            typeof event.cost === "number" ? event.cost : null,
          );
        });

        return result;
      } catch (error) {
        unsubscribe?.();
        unsubscribe = undefined;
        await costGate.release({
          reservationId: costReservationId,
          provider: adapter.provider,
          model: turnInput.model ?? "unknown",
        });
        throw error;
      }
    },
  };
}
