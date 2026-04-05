public function processDelete($id) {
    // Fetch the brand by ID
    $brand = Brand::findOrFail($id);

    // Deleting associated models, for example:
    // $brand->associatedModels()->delete();

    // Now delete the brand
    $brand->delete();

    // Return a success response
    return response()->json(['message' => 'Brand deleted successfully.'], 200);
}