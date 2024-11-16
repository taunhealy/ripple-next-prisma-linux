import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { ContentViewMode } from "@/types/enums";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import {
  addToCart,
  moveItem,
  deleteCartItem,
  optimisticAddToCart,
  fetchCartItems,
} from "@/app/store/features/cartSlice";
import { CartType } from "@prisma/client";
import { UseItemActionsProps } from "@/types/actions";
import { ItemType } from "@prisma/client";

export function useItemActions({
  itemId,
  itemType,
  contentViewMode,
  requestViewMode,
}: UseItemActionsProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const dispatch = useAppDispatch();
  const loading = useAppSelector((state) => state.cart.loading[itemId]);

  // Add to Cart Mutation
  const addToCartMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/cart/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          presetId: itemType === ItemType.PRESET ? itemId : undefined,
          packId: itemType === ItemType.PACK ? itemId : undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to add to cart");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      toast.success(
        `${itemType.charAt(0).toUpperCase() + itemType.slice(1)} added to cart`
      );
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Add to Wishlist Mutation
  const addToWishlistMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/cart/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          presetId: itemType === ItemType.PRESET ? itemId : undefined,
          packId: itemType === ItemType.PACK ? itemId : undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to add to wishlist");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
      toast.success(
        `${
          itemType.charAt(0).toUpperCase() + itemType.slice(1)
        } added to wishlist`
      );
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Delete Item Mutation
  const deleteItemMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/${itemType}s/${itemId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to delete ${itemType}`);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`${itemType}s`] });
      toast.success(
        `${
          itemType.charAt(0).toUpperCase() + itemType.slice(1)
        } deleted successfully`
      );
      if (contentViewMode === ContentViewMode.UPLOADED) {
        router.push(`/dashboard/${itemType}s`);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Edit Item Mutation (if needed for optimistic updates)
  const editItemMutation = useMutation({
    mutationFn: async () => {
      router.push(`/dashboard/${itemType.toLowerCase()}s/edit/${itemId}`);
    },
  });

  // Move Item Mutation
  const moveItemMutation = useMutation({
    mutationFn: async (from: "wishlist" | "cart") => {
      const response = await fetch(`/api/cart/${from}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId,
          from,
          to: "cart",
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to move item");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
      toast.success(
        `${itemType.charAt(0).toUpperCase() + itemType.slice(1)} moved to cart`
      );
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Remove Item Mutation
  const removeItemMutation = useMutation({
    mutationFn: async (from: "wishlist" | "cart") => {
      const response = await fetch(`/api/cart/${from}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to remove item");
      }
      return response.json();
    },
    onSuccess: (_, from) => {
      queryClient.invalidateQueries({ queryKey: [from] });
      toast.success(
        `${
          itemType.charAt(0).toUpperCase() + itemType.slice(1)
        } removed from ${from}`
      );
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleAddToCart = async () => {
    try {
      // Optimistic update
      dispatch(
        optimisticAddToCart({
          itemId,
          type: CartType.CART,
          item: {
            id: itemId,
            itemType,
            quantity: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
            cartId: "",
            presetId: itemType === "PRESET" ? itemId : null,
            packId: itemType === "PACK" ? itemId : null,
          },
        })
      );

      // Make the API call
      await dispatch(
        addToCart({
          itemId,
          cartType: CartType.CART,
          itemType: itemType as "PRESET" | "PACK",
        })
      ).unwrap();

      // Fetch latest state
      await dispatch(fetchCartItems(CartType.CART));

      toast.success(
        `${itemType.charAt(0).toUpperCase() + itemType.slice(1)} added to cart`
      );
    } catch (error) {
      // Revert optimistic update by fetching current state
      await dispatch(fetchCartItems(CartType.CART));

      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Failed to add to cart");
      }
    }
  };

  const handleMoveToCart = async (from: CartType) => {
    try {
      await dispatch(
        moveItem({
          itemId,
          from,
          to: CartType.CART,
        })
      ).unwrap();

      // Fetch both cart types to update UI
      await Promise.all([
        dispatch(fetchCartItems(CartType.CART)),
        dispatch(fetchCartItems(CartType.WISHLIST)),
      ]);

      toast.success(`${itemType} moved to cart`);
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Failed to move item");
      }
    }
  };

  const handleRemoveItem = async (type: "wishlist" | "cart") => {
    try {
      await dispatch(
        deleteCartItem({
          itemId,
          type: type.toUpperCase() as keyof typeof CartType,
          itemType: itemType as "PRESET" | "PACK",
        })
      ).unwrap();
      toast.success(
        `${type.charAt(0).toUpperCase() + type.slice(1)} removed from ${type}`
      );
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Failed to remove item");
      }
    }
  };

  const handleDelete = async () => {
    await deleteItemMutation.mutate();
    // Redirect based on view mode type
    if (itemType === ItemType.REQUEST && requestViewMode) {
      router.push(`/requests?view=${requestViewMode}`);
    } else if (contentViewMode) {
      router.push(`/dashboard/${itemType}s`);
    }
  };

  return {
    // Cart/Wishlist actions
    handleAddToCart,
    handleAddToWishlist: () => addToWishlistMutation.mutate(),
    handleMoveToCart,
    handleRemoveItem,

    // Item management actions
    handleDelete,
    handleEdit: () => editItemMutation.mutate(),

    // Loading states
    isLoading: loading,
    isAddingToCart: addToCartMutation.isPending,
    isAddingToWishlist: addToWishlistMutation.isPending,
    isMovingToCart: moveItemMutation.isPending,
    isRemoving: removeItemMutation.isPending,
    isDeleting: deleteItemMutation.isPending,
    isEditing: editItemMutation.isPending,
  };
}
