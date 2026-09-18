import {
  CloudRain,
  Compass,
  Droplets,
  Gauge,
  Thermometer,
  Wind,
  type LucideIcon,
} from "lucide-react";
import type { WeatherField } from "@/lib/types";

const ICONS: Record<WeatherField, LucideIcon> = {
  temperature: Thermometer,
  humidity: Droplets,
  pressure: Gauge,
  wind_speed: Wind,
  wind_direction: Compass,
  rainfall: CloudRain,
};

export function MetricIcon({
  field,
  className,
}: {
  field: WeatherField;
  className?: string;
}) {
  const Icon = ICONS[field];
  return <Icon className={className} />;
}
