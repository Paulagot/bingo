import React from "react";
import { CheckCircle, Target } from "lucide-react";
import { roundTypeMap } from "../../constants/quiztypeconstants";

interface Props {
  setupConfig: any;
}

const ReviewQuizStructureSection: React.FC<Props> = ({ setupConfig }) => {
  const rounds = setupConfig.roundDefinitions || [];

  return (
    <div className="bg-muted border-border rounded-xl border-2 p-4 shadow-sm md:p-6">
      {/* Header */}
      <div className="mb-4 flex items-center space-x-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-100 text-2xl">🎯</div>

        <div className="flex-1">
          <h3 className="text-fg text-lg font-semibold">Quiz Structure</h3>
          <p className="text-fg/70 text-sm">{rounds.length} rounds configured</p>
        </div>

        {rounds.length > 0 && <CheckCircle className="h-5 w-5 text-green-600" />}
      </div>

      {/* Round Cards */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {rounds.map((round: any, idx: number) => (
          <div key={idx} className="border-border rounded-lg border bg-gray-50 p-3">
            <div className="mb-2 flex items-center space-x-2">
              <Target className="h-4 w-4 text-indigo-600" />
              <span className="text-fg font-medium">Round {idx + 1}</span>
            </div>

            <div className="space-y-1 text-sm">
              {/* Round Type */}
              <p className="text-fg font-medium">
              {roundTypeMap[round.roundType as keyof typeof roundTypeMap]?.name || round.roundType}

              </p>

              {/* Question Count */}
              <p className="text-fg/70">
                {round.config?.questionsPerRound} questions
              </p>

              {/* Category */}
              {round.category && (
                <span className="inline-block rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                  {round.category}
                </span>
              )}

              {/* Difficulty */}
              {round.difficulty && (
                <span
                  className={`inline-block rounded px-2 py-0.5 text-xs ${
                    round.difficulty === "easy"
                      ? "bg-green-100 text-green-700"
                      : round.difficulty === "medium"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {round.difficulty.charAt(0).toUpperCase() +
                    round.difficulty.slice(1)}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReviewQuizStructureSection;
