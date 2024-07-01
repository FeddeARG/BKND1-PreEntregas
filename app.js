const express = require("express");
const fs = require('fs').promises;

const app = express();
const PORT = 8080;

app.listen(PORT, () => {
    console.log("Server running on PORT:", PORT);
});

class Product {
    constructor(id, title, description, code, price, status, stock, category, thumbnails) {
        this.id = id;
        this.title = title;
        this.description = description;
        this.code = code;
        this.price = price;
        this.status = status;
        this.stock = stock;
        this.category = category;
        this.thumbnails = thumbnails;
    }

    toJSON() {
        return {
            id: this.id,
            title: this.title,
            description: this.description,
            code: this.code,
            price: this.price,
            status: this.status,
            stock: this.stock,
            category: this.category,
            thumbnails: this.thumbnails
        };
    }
}

class ProductManager {
    constructor(filePath) {
        this.path = filePath;
        this.initFile();
    }

    async initFile() {
        try {
            await fs.access(this.path);
        } catch (error) {
            await fs.writeFile(this.path, JSON.stringify([]));
        }
    }

    async getProductsFromFile() {
        try {
            const data = await fs.readFile(this.path, 'utf-8');
            return JSON.parse(data);
        } catch (error) {
            console.error('Error reading file', error);
            return [];
        }
    }

    async saveProductsToFile(products) {
        try {
            await fs.writeFile(this.path, JSON.stringify(products, null, 2));
        } catch (error) {
            console.error('Error writing file', error);
        }
    }

    async getNextId() {
        const products = await this.getProductsFromFile();
        if (products.length === 0) {
            return 1;
        }
        const maxId = products.reduce((max, product) => (product.id > max ? product.id : max), 0);
        return maxId + 1;
    }

    async addOrUpdateProduct(title, description, code, price, status, stock, category, thumbnails) {
        const products = await this.getProductsFromFile();
        const existingProductIndex = products.findIndex(product => product.title === title);

        if (existingProductIndex !== -1) {
            products[existingProductIndex].stock += stock;
        } else {
            const id = await this.getNextId();
            const newProduct = new Product(id, title, description, code, price, status, stock, category, thumbnails);
            products.push(newProduct);
        }

        await this.saveProductsToFile(products);
        return products[existingProductIndex] || products[products.length - 1];
    }
}

const productManager = new ProductManager('products.json');

(async () => {
    const products = [
        { title: "Producto 1", description: "Desc. prod 1", code: "Code-Prod1", price: 1000, status: true, stock: 10, category: "Hardware", thumbnails: "/" },
        { title: "Producto 2", description: "Desc. prod 2", code: "Code-Prod2", price: 100, status: true, stock: 100, category: "Software", thumbnails: "/" },
        { title: "Producto 3", description: "Desc. prod 3", code: "Code-Prod3", price: 200, status: true, stock: 20, category: "Software", thumbnails: "/" },
        { title: "Producto 4", description: "Desc. prod 4", code: "Code-Prod4", price: 350, status: true, stock: 32, category: "Software", thumbnails: "/" },
        { title: "Producto 5", description: "Desc. prod 5", code: "Code-Prod5", price: 2000, status: true, stock: 8, category: "Hardware", thumbnails: "/" },
        { title: "Producto 1", description: "Desc. prod 1", code: "Code-Prod1", price: 1000, status: true, stock: 5, category: "Hardware", thumbnails: "/" }
    ];

    for (const product of products) {
        const newProduct = await productManager.addOrUpdateProduct(
            product.title,
            product.description,
            product.code,
            product.price,
            product.status,
            product.stock,
            product.category,
            product.thumbnails
        );
        console.log('Producto agregado o actualizado:', newProduct);
    }
})();