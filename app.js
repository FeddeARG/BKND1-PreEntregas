const express = require("express");
const fs = require('fs').promises;
const bodyParser = require('body-parser');

const app = express();
const PORT = 8080;

app.use(bodyParser.json());

app.listen(PORT, () => {
    console.log("Server running on PORT:", PORT);
});

class Product {
    constructor(id, title, description, code, price, status = true, stock, category, thumbnails = []) {
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
    
    async addProduct(title, description, code, price, stock, category, thumbnails) {
        const products = await this.getProductsFromFile();
        const id = await this.getNextId();
        const newProduct = new Product(id, title, description, code, price, true, stock, category, thumbnails);
        products.push(newProduct);
        await this.saveProductsToFile(products);
        return newProduct;
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

    async updateProduct(id, updates) {
        const products = await this.getProductsFromFile();
        const productIndex = products.findIndex(product => product.id === parseInt(id));
        if (productIndex === -1) {
            return null;
        }
        const product = products[productIndex];
        const updatedProduct = { ...product, ...updates, id: product.id };
        products[productIndex] = updatedProduct;
        await this.saveProductsToFile(products);
        return updatedProduct;
    }

    async getProductById(id) {
        const products = await this.getProductsFromFile();
        return products.find(product => product.id === parseInt(id));
    }

    async deleteProduct(id) {
        const products = await this.getProductsFromFile();
        const newProducts = products.filter(product => product.id !== parseInt(id));
        await this.saveProductsToFile(newProducts);
        return newProducts.length !== products.length;
    }
}

class Cart {
    constructor(id, products = []) {
        this.id = id;
        this.products = products;
    }

    toJSON() {
        return {
            id: this.id,
            products: this.products
        };
    }
}

class CartManager {
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

    async getCartsFromFile() {
        try {
            const data = await fs.readFile(this.path, 'utf-8');
            return JSON.parse(data);
        } catch (error) {
            console.error('Error reading file', error);
            return [];
        }
    }

    async saveCartsToFile(carts) {
        try {
            await fs.writeFile(this.path, JSON.stringify(carts, null, 2));
        } catch (error) {
            console.error('Error writing file', error);
        }
    }

    async getNextId() {
        const carts = await this.getCartsFromFile();
        if (carts.length === 0) {
            return 1;
        }
        const maxId = carts.reduce((max, cart) => (cart.id > max ? cart.id : max), 0);
        return maxId + 1;
    }

    async createCart() {
        const carts = await this.getCartsFromFile();
        const id = await this.getNextId();
        const newCart = new Cart(id);
        carts.push(newCart);
        await this.saveCartsToFile(carts);
        return newCart;
    }

    async getCartById(id) {
        const carts = await this.getCartsFromFile();
        return carts.find(cart => cart.id === parseInt(id));
    }

    async addProductToCart(cartId, productId) {
        const carts = await this.getCartsFromFile();
        const cartIndex = carts.findIndex(cart => cart.id === parseInt(cartId));
        if (cartIndex === -1) {
            return null;
        }
        const cart = carts[cartIndex];
        const productIndex = cart.products.findIndex(product => product.product === parseInt(productId));
        if (productIndex !== -1) {
            cart.products[productIndex].quantity += 1;
        } else {
            cart.products.push({ product: parseInt(productId), quantity: 1 });
        }
        carts[cartIndex] = cart;
        await this.saveCartsToFile(carts);
        return cart;
    }
}


const productManager = new ProductManager('products.json');
const cartManager = new CartManager('carts.json');


app.get("/", async (req, res) => {
    const { limit } = req.query;
    const products = await productManager.getProductsFromFile();
    if (limit) {
        return res.json(products.slice(0, limit));
    }
    res.json(products);
});

app.get("/:pid", async (req, res) => {
    const { pid } = req.params;
    const product = await productManager.getProductById(pid);
    if (product) {
        res.json(product);
    } else {
        res.status(404).send({ error: "Producto no encontrado" });
    }
});

app.post("/", async (req, res) => {
    const { title, description, code, price, stock, category, thumbnails } = req.body;

    if (!title || !description || !code || price === undefined || !stock || !category) {
        return res.status(400).send({ error: "Todos los campos son obligatorios, excepto thumbnails" });
    }

    try {
        const newProduct = await productManager.addProduct(title, description, code, price, stock, category, thumbnails);
        res.status(201).send(newProduct);
    } catch (error) {
        res.status(500).send({ error: "Error al agregar el producto" });
    }
});

app.put("/:pid", async (req, res) => {
    const { pid } = req.params;
    const updates = req.body;

    if (updates.id) {
        return res.status(400).send({ error: "No se puede actualizar el ID del producto" });
    }

    try {
        const updatedProduct = await productManager.updateProduct(pid, updates);
        if (updatedProduct) {
            res.json(updatedProduct);
        } else {
            res.status(404).send({ error: "Producto no encontrado" });
        }
    } catch (error) {
        res.status(500).send({ error: "Error al actualizar el producto" });
    }
});

app.delete("/:pid", async (req, res) => {
    const { pid } = req.params;

    try {
        const success = await productManager.deleteProduct(pid);
        if (success) {
            res.status(204).send();
        } else {
            res.status(404).send({ error: "Producto no encontrado" });
        }
    } catch (error) {
        res.status(500).send({ error: "Error al eliminar el producto" });
    }
});


const cartRouter = express.Router();

cartRouter.post("/", async (req, res) => {
    try {
        const newCart = await cartManager.createCart();
        res.status(201).send(newCart);
    } catch (error) {
        res.status(500).send({ error: "Error al crear el carrito" });
    }
});

cartRouter.get("/:cid", async (req, res) => {
    const { cid } = req.params;
    const cart = await cartManager.getCartById(cid);
    if (cart) {
        res.json(cart);
    } else {
        res.status(404).send({ error: "Carrito no encontrado" });
    }
});

cartRouter.post("/:cid/product/:pid", async (req, res) => {
    const { cid, pid } = req.params;
    try {
        const updatedCart = await cartManager.addProductToCart(cid, pid);
        if (updatedCart) {
            res.status(201).send(updatedCart);
        } else {
            res.status(404).send({ error: "Carrito o producto no encontrado" });
        }
    } catch (error) {
        res.status(500).send({ error: "Error al agregar producto al carrito" });
    }
});

app.use("/api/carts", cartRouter);

console.log(`Server is running on http://localhost:${PORT}`);