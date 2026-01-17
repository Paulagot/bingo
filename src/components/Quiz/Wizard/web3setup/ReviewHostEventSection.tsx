import React from "react";
import { User, Calendar, Clock, MapPin, Layers, Users, CheckCircle } from "lucide-react";

interface Props {
  setupConfig: any;
}

const ReviewHostEventSection: React.FC<Props> = ({ setupConfig }) => {
  const hasHostName = !!setupConfig.hostName;

  const formatEventDateTime = (dateTime?: string) => {
    if (!dateTime) return null;
    const date = new Date(dateTime);
    return {
      date: date.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      time: date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }),
    };
  };

  const eventDateTime = formatEventDateTime(setupConfig.eventDateTime || "");

  return (
    <div className="bg-muted border-border rounded-xl border-2 p-4 shadow-sm md:p-6">
      <div className="mb-4 flex items-center space-x-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 text-2xl">👤</div>
        <div className="flex-1">
          <h3 className="text-fg text-lg font-semibold">Host & Event</h3>
          <p className="text-fg/70 text-sm">Basic event information</p>
        </div>
        {hasHostName && <CheckCircle className="h-5 w-5 text-green-600" />}
      </div>

      <div className="space-y-3 text-sm">
        {/* Host Name */}
        <div className="flex items-center space-x-3">
          <User className="text-fg/60 h-4 w-4" />
          <div>
            <p className="text-fg">{setupConfig.hostName || "Not provided"}</p>
          </div>
        </div>

        {/* Event Date
        {eventDateTime ? (
          <div className="flex items-start space-x-3">
            <Calendar className="text-fg/60 mt-1 h-4 w-4" />
            <div>
              <p className="text-fg/80 text-xs font-medium">Scheduled</p>
              <p className="text-fg">{eventDateTime.date}</p>

              <div className="mt-1 flex items-center space-x-2">
                <Clock className="h-3 w-3 text-gray-400" />
                <span className="text-fg/70">{eventDateTime.time}</span>
              </div>

              <div className="flex items-center space-x-2">
                <MapPin className="h-3 w-3 text-gray-400" />
                <span className="text-fg/60 text-xs">{setupConfig.timeZone || "Unknown timezone"}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center space-x-3">
            <Calendar className="text-fg/60 h-4 w-4" />
            <div>
              <p className="text-fg/80 text-xs font-medium">Event Date</p>
              <p className="text-fg">Not scheduled</p>
            </div>
          </div>
        )} */}

        {/* Template */}
        {(setupConfig.selectedTemplate || setupConfig.skipRoundConfiguration !== undefined) && (
          <div className="flex items-center space-x-3">
            <Layers className="text-fg/60 h-4 w-4" />
            <div>
              <p className="text-fg/80 text-xs font-medium">Template</p>
              <p className="text-fg">
                {setupConfig.selectedTemplate ? String(setupConfig.selectedTemplate) : "Custom"}{" "}
                {setupConfig.skipRoundConfiguration ? "(rounds auto-configured)" : ""}
              </p>
            </div>
          </div>
        )}

        {/* Max Players */}
        {(setupConfig as any).maxPlayers && (
          <div className="flex items-center space-x-3">
            <Users className="text-fg/60 h-4 w-4" />
            <div>
              <p className="text-fg/80 text-xs font-medium">Max Players</p>
              <p className="text-fg">{(setupConfig as any).maxPlayers}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewHostEventSection;
