import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Boxes, Plus, ChefHat } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function FnbInventory() {
  const { toast } = useToast();
  const [recipes] = useState<Array<{
    id: string;
    menuItem: string;
    ingredients: Array<{ name: string; quantity: number; unit: string }>;
  }>>([
    {
      id: "1",
      menuItem: "Nasi Goreng",
      ingredients: [
        { name: "Rice", quantity: 200, unit: "g" },
        { name: "Egg", quantity: 2, unit: "pcs" },
        { name: "Oil", quantity: 20, unit: "ml" },
      ],
    },
  ]);

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Boxes className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">Recipe & BOM</h1>
            </div>
            <p className="text-muted-foreground">
              Manage recipes and ingredient tracking for menu items
            </p>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Recipe
          </Button>
        </div>

        <div className="space-y-4">
          {recipes.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <ChefHat className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No recipes yet</p>
                <Button className="mt-4" variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Recipe
                </Button>
              </CardContent>
            </Card>
          ) : (
            recipes.map((recipe) => (
              <Card key={recipe.id}>
                <CardHeader>
                  <CardTitle>{recipe.menuItem}</CardTitle>
                  <CardDescription>Recipe ingredients and quantities</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {recipe.ingredients.map((ingredient, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 border rounded"
                      >
                        <span className="font-medium">{ingredient.name}</span>
                        <span className="text-sm text-muted-foreground">
                          {ingredient.quantity} {ingredient.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button variant="outline" size="sm">
                      Edit Recipe
                    </Button>
                    <Button variant="outline" size="sm">
                      View Inventory
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
