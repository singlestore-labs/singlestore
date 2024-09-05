export type RegionProvider = "AWS" | "GCP" | "Azure";

export type RegionName =
  | "US West 2 (Oregon)"
  | "US East 1 (N. Virginia)"
  | "Europe West 1 (Ireland)"
  | "Europe Central 1 (Frankfurt)"
  | "US East 1 (N. Virginia) - HD2"
  | "Asia Pacific Northeast 2 (Seoul)"
  | "Asia Pacific Southeast 1 (Singapore)"
  | "Asia Pacific Southeast 3 (Jakarta)"
  | "Europe West 2 (London)"
  | "Middle East 1 (UAE)"
  | "Asia Pacific Southeast 2 (Sydney)"
  | "US East 2 (Ohio)"
  | "Europe West 3 (Paris)"
  | "Canada Central 1 (Montreal)"
  | "Africa South 1 (Cape Town)"
  | "South America East 1 (Sao Paulo)"
  | "Asia Pacific South 1 (Mumbai)"
  | "Europe North 1 (Stockholm)";

export class Region {
  constructor(
    public id: string,
    public name: RegionName,
    public provider: RegionProvider,
  ) {}
}
