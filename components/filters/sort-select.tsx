"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQueryStates, parseAsString } from "nuqs";
import { Button } from "../ui/button";

export function SortSelect() {
  const [sort, setSort] = useQueryStates(
    {
      type: parseAsString.withDefault("latest"),
    },
    {
      shallow: false,
    }
  );

  return (
    <Select
      value={sort.type}
      onValueChange={(value) => setSort({ type: value })}
    >
      <SelectTrigger className="relative flex-1 min-w-0 min-h-[44px] sm:min-h-[36px]">
        <SelectValue placeholder="Sort by" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="latest">Latest</SelectItem>
        <SelectItem value="popular">Popular</SelectItem>
      </SelectContent>
    </Select>
  );
}
