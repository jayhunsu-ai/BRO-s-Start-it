import type { ProviderCostGate } from "../../server/agent-os/cost-gate.js";
import { CostController } from "./cost-controller.js";

/**
 * Structural adapter for the Blocks financial airlock.
 *
 * Blocks remains the execution substrate. Agent OS remains the budget
 * authority. A reservation is created before a provider turn and its id is
 * handed to Blocks as AGENT_OS_COST_RESERVATION_ID.
 */
export function createBlocksCostGate(costController: CostController): ProviderCostGate {
  return {
    authorize(input) {
      const reservation = costController.authorizeReservation(input.reservationId);
      return {
        reservationId: reservation.reservationId,
        projectId: reservation.projectId,
        taskId: reservation.taskId,
      };
    },

    settle(input) {
      if (input.actualCostUsd === null) {
        // Unknown usage after a provider process ran is not silently treated
        // as zero. Charge the full reserved maximum until a verified usage
        // reconciliation replaces it.
        const reservation = costController.authorizeReservation(input.reservationId);
        return costController.commit(input.reservationId, {
          provider: input.provider,
          model: input.model,
          actualCostUsd: reservation.maxCostUsd,
          result: input.result,
        });
      }

      return costController.commit(input.reservationId, {
        provider: input.provider,
        model: input.model,
        actualCostUsd: input.actualCostUsd,
        result: input.result,
      });
    },

    release(input) {
      costController.release(input.reservationId);
    },
  };
}
