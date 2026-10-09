import { useEffect, useState } from "react";

import { networkLabel, objectId } from "../config";
import { mapBuilderCard } from "../lib/mapBuilderCard";
import { suiClient } from "../lib/suiClient";

import type {
  BuilderCardView,
  PortfolioStatus,
  UsePortfolioResult,
} from "../types";

const BUILDER_CARD_TYPE_SUFFIX = "::builder_card::BuilderCard";

export function usePortfolio(): UsePortfolioResult {
  const [status, setStatus] = useState<PortfolioStatus>(() =>
    objectId ? "loading" : "empty",
  );

  const [data, setData] = useState<BuilderCardView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!objectId) {
      setStatus("empty");
      setData(null);
      setError(null);
      return;
    }

    let cancelled = false;

    async function loadPortfolio() {
      setStatus("loading");
      setData(null);
      setError(null);

      try {
        const response = await suiClient.getObject({
          objectId,
          include: {
            json: true,
          },
        });

        if (cancelled) return;

        const object = response.object;

        if (!object) {
          throw new Error("BuilderCard object not found.");
        }

        if (!object.type?.endsWith(BUILDER_CARD_TYPE_SUFFIX)) {
          throw new Error(
            `Unexpected object type: ${object.type ?? "unknown"}`,
          );
        }

        if (!object.json || typeof object.json !== "object") {
          throw new Error(
            "BuilderCard object does not contain readable JSON fields.",
          );
        }

        const fields = object.json as Record<string, unknown>;

        const view = mapBuilderCard(
          fields,
          object.objectId,
          object.owner,
          networkLabel,
        );

        setData(view);
        setStatus("success");
      } catch (fetchError) {
        if (cancelled) return;

        console.error("Failed to load BuilderCard:", fetchError);

        setStatus("error");

        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Could not load on-chain data.",
        );
      }
    }

    void loadPortfolio();

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    status,
    data,
    error,
  };
}
