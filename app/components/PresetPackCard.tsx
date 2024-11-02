"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { ItemActionButtons } from "./ItemActionButtons";
import Link from "next/link";
import { PriceChangeDisplay } from "@/app/components/PriceChangeDisplay";
import {
  PackageIcon,
  Edit2Icon,
  PlayIcon,
  PauseIcon,
  TrashIcon,
} from "lucide-react";
import { useState, useCallback, useEffect } from "react";
import { toast } from "react-toastify";
import { useQueryClient } from "@tanstack/react-query";
import { addToCart } from "@/app/store/features/cartSlice";

interface PresetPackCardProps {
  pack: {
    id: string;
    title: string;
    description?: string;
    price: number;
    presets: {
      preset: {
        id: string;
        title: string;
        soundPreviewUrl?: string;
      };
    }[];
    soundDesigner?: {
      username: string;
      profileImage?: string;
    };
  };
  isOwner?: boolean;
}

export function PresetPackCard({ pack, isOwner }: PresetPackCardProps) {
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const queryClient = useQueryClient();

  const cleanupAudio = useCallback(() => {
    if (audio) {
      audio.pause();
      audio.removeEventListener("ended", () => setIsPlaying(false));
      setAudio(null);
      setIsPlaying(false);
      setActivePreset(null);
    }
  }, [audio]);

  useEffect(() => {
    return cleanupAudio;
  }, [cleanupAudio]);

  const togglePlay = useCallback(
    (presetId: string, soundPreviewUrl?: string) => {
      if (!soundPreviewUrl) {
        toast.info("No preview available for this preset");
        return;
      }

      if (activePreset && activePreset !== presetId) {
        cleanupAudio();
      }

      if (!audio || activePreset !== presetId) {
        const newAudio = new Audio(soundPreviewUrl);
        newAudio.addEventListener("ended", () => {
          setIsPlaying(false);
          setActivePreset(null);
        });
        newAudio.addEventListener("error", () => {
          toast.error("Failed to load audio");
          cleanupAudio();
        });
        setAudio(newAudio);
        setActivePreset(presetId);
        newAudio.play().catch(() => {
          toast.error("Failed to play audio");
          cleanupAudio();
        });
        setIsPlaying(true);
      } else {
        if (isPlaying) {
          audio.pause();
          setIsPlaying(false);
        } else {
          audio.play().catch(() => {
            toast.error("Failed to play audio");
            cleanupAudio();
          });
          setIsPlaying(true);
        }
      }
    },
    [audio, isPlaying, cleanupAudio, activePreset]
  );

  const handleDelete = async () => {
    const response = await fetch(`/api/presetPacks/${pack.id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error("Failed to delete preset pack");
    }

    await queryClient.invalidateQueries({ queryKey: ["presetPacks"] });
  };

  const handleAddToCart = async () => {
    try {
      await addToCart({
        itemId: pack.id,
        type: "WISHLIST",
        itemType: "PACK"
      });
      toast.success("Pack added to wishlist");
    } catch (error) {
      toast.error("Failed to add pack to wishlist");
    }
  };

  const displayedPresets = pack.presets.slice(0, 5);

  return (
    <Card className="relative group overflow-hidden hover:shadow-lg transition-all duration-300">
      {isOwner && (
        <div className="absolute top-2 right-2 z-10">
          <ItemActionButtons
            id={pack.id}
            price={pack.price}
            type="pack"
            onDelete={handleDelete}
            isOwner={isOwner}
          />
        </div>
      )}

      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-xl">{pack.title}</CardTitle>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col">
        <PriceChangeDisplay
          currentPrice={pack.price}
          size="lg"
          className="mb-4"
          itemType="pack"
        />

        {pack.description && (
          <p className="text-sm text-muted-foreground mb-4">
            {pack.description}
          </p>
        )}

        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2">
            <PackageIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              {pack.presets.length} Presets Included
            </span>
          </div>
          {pack.soundDesigner && (
            <p className="text-sm text-muted-foreground">
              By: {pack.soundDesigner.username}
            </p>
          )}
        </div>

        <div className="space-y-2 mb-4">
          {displayedPresets.map((item) => (
            <div
              key={item.preset.id}
              className="flex items-center justify-between p-2 bg-muted rounded-md"
            >
              <span className="text-sm truncate flex-1">
                {item.preset.title}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="ml-2"
                onClick={() =>
                  togglePlay(item.preset.id, item.preset.soundPreviewUrl)
                }
                disabled={!item.preset.soundPreviewUrl}
              >
                {isPlaying && activePreset === item.preset.id ? (
                  <PauseIcon className="h-4 w-4" />
                ) : (
                  <PlayIcon className="h-4 w-4" />
                )}
              </Button>
            </div>
          ))}
        </div>

        <div className="mt-auto space-y-2">
          <Link href={`/packs/${pack.id}`} className="w-full">
            <Button className="w-full" variant="default">
              View Details
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}