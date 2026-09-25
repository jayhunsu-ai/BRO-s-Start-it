import { CostController } from "./cost-controller.js";

export interface BlocksCostGate {
  authorize(input: {
    reservationId: string;
    provider: string;
    model: string;
    projectId?: string;
    taskId?: string;
  }): Promise<{ reservationId: string; projectId?: string; taskId?: string }> | { reservationId: string; projectId?: string; taskId?: string };
  settle(input: {
    reservationId: string;
    provider: string;
    model: string;
    actualCostUsd: number | null;
    result: "ok" | "error" | "denied";
  }): Promise<void> | void;
  release(input: { reservationId: string; provider: string; model: string }): Promise<void> | void;
}

export function createBlocksCostGate(costController: CostController): BlocksCostGate {
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
        // Unknown usage is conservatively charged at the full reservation.
        const reservation = costController.authorizeReservation(input.reservationId);
        costController.commit(input.reservationId, {
          provider: input.provider,
          model: input.model,
          actualCostUsd: reservation.maxCostUsd,
          result: input.result,
        });
        return;
      }

      costController.commit(input.reservationId, {
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
