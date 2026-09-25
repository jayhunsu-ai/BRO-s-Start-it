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
  sendTurn(
    input: SendTurnInput & {
      costReservationId: string;
      projectId?: string;
      taskId?: string;
    },
  ): Promise<TurnStartResult>;
}

export function createProviderExecutionGateway(
  adapter: ProviderAdapter,
  costGate: BlocksCostGate,
): ProviderExecutionGateway {
  return {
    async sendTurn(input) {
      const { costReservationId, projectId, taskId, ...turnInput } = input;
      const model = turnInput.model ?? "unknown";

      await costGate.authorize({
        reservationId: costReservationId,
        provider: adapter.provider,
        model,
        projectId,
        taskId,
      });

      let settled = false;
      let unsubscribe: (() => void) | undefined;
      const completions: Array<{
        turnId?: string;
        ok: boolean;
        cost?: number | null;
      }> = [];

      const settleOnce = async (
        result: "ok" | "error",
        actualCostUsd: number | null,
      ) => {
        if (settled) return;
        settled = true;
        unsubscribe?.();
        unsubscribe = undefined;
        await costGate.settle({
          reservationId: costReservationId,
          provider: adapter.provider,
          model,
          actualCostUsd,
          result,
        });
      };

      // Subscribe before sendTurn because a provider may emit turn.completed
      // synchronously/asynchronously before sendTurn resolves with the turn ID.
      unsubscribe = adapter.onEvent((event) => {
        if (event.type === "turn.completed") {
          completions.push({
            turnId: event.turnId,
            ok: event.ok,
            cost: event.cost,
          });
        }
      });

      try {
        const result = await adapter.sendTurn(turnInput);

        const completed = completions.find((event) => event.turnId === result.turnId);
        if (completed) {
          await settleOnce(
            completed.ok ? "ok" : "error",
            typeof completed.cost === "number" ? completed.cost : null,
          );
          return result;
        }

        // The turn is still running. Replace the broad listener with a
        // turn-specific listener so unrelated turns cannot settle this hold.
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
          model,
        });
        throw error;
      }
    },
  };
}
