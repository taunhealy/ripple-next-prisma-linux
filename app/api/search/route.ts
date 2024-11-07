import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { PresetUpload } from "@prisma/client";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const searchTerm = searchParams.get("searchTerm") || "";
  const genres = searchParams.get("genres")?.split(",").filter(Boolean) || [];
  const vstTypes =
    searchParams.get("vstTypes")?.split(",").filter(Boolean) || [];
  const presetTypes =
    searchParams.get("presetTypes")?.split(",").filter(Boolean) || [];

  try {
    const whereClause: any = {
      AND: [],
    };

    // Add search term filter
    if (searchTerm.trim()) {
      whereClause.AND.push({
        OR: [
          { title: { contains: searchTerm.trim(), mode: "insensitive" } },
          { description: { contains: searchTerm.trim(), mode: "insensitive" } },
        ],
      });
    }

    // Add genre filter
    if (genres.length > 0) {
      whereClause.AND.push({ genreId: { in: genres } });
    }

    // Add VST type filter
    if (vstTypes.length > 0) {
      whereClause.AND.push({
        vst: {
          type: { in: vstTypes },
        },
      });
    }

    // Add preset type filter
    if (presetTypes.length > 0) {
      whereClause.AND.push({ presetType: { in: presetTypes } });
    }

    // Remove AND array if empty
    if (whereClause.AND.length === 0) {
      delete whereClause.AND;
    }

    const presets = await prisma.presetUpload.findMany({
      where: whereClause,
      include: {
        soundDesigner: {
          select: {
            username: true,
            profileImage: true,
          },
        },
        genre: true,
        vst: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(presets);
  } catch (error) {
    console.error("Error fetching marketplace presets:", error);
    return NextResponse.json(
      { error: "Failed to fetch presets" },
      { status: 500 }
    );
  }
}
