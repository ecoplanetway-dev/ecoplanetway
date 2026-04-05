<!-- Categories Template with Font Awesome Icons -->
<div class="categories">
    <div class="category">
        <i class="fas fa-wrench"></i>
        <span>Wrench</span>
    </div>
    <div class="category">
        <i class="fas fa-cog"></i>
        <span>Cog</span>
    </div>
    <div class="category">
        <i class="fas fa-ban"></i>
        <span>Ban</span>
    </div>
    <div class="category">
        <i class="fas fa-bolt"></i>
        <span>Bolt</span>
    </div>
    <div class="category">
        <i class="fas fa-plug"></i>
        <span>Plug</span>
    </div>
    <div class="category">
        <i class="fas fa-cube"></i>
        <span>Cube</span>
    </div>
    <div class="category">
        <i class="fas fa-box"></i>
        <span>Box</span>
    </div>
    <div class="category">
        <i class="fas fa-battery-full"></i>
        <span>Battery</span>
    </div>
    <div class="category">
        <i class="fas fa-lightbulb"></i>
        <span>Lightbulb</span>
    </div>
    <div class="category">
        <i class="fas fa-sync-alt"></i>
        <span>Refresh</span>
    </div>
    <div class="category">
        <i class="fas fa-shield-alt"></i>
        <span>Shield</span>
    </div>
    <div class="category">
        <i class="fas fa-heart"></i>
        <span>Heart</span>
    </div>
</div>
<style>
    .categories {
        display: flex;
        flex-wrap: wrap;
        gap: 20px;
        padding: 10px;
    }
    .category {
        flex: 1 1 150px;
        text-align: center;
        padding: 10px;
        border: 1px solid #ccc;
        border-radius: 5px;
        transition: transform 0.2s;
    }
    .category i {
        font-size: 24px;
        color: #555;
    }
    .category:hover {
        transform: scale(1.05);
        border-color: #007bff;
    }
</style>
