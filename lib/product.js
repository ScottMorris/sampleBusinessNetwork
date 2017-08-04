/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @param {org.example.transaction.ProductNote} tx The product note transaction
 * @transaction
 */
function addProductNote(tx) {
    var pid = getCurrentParticipant().getIdentifier();
    var product = tx.Product;
    addNote(product, tx.Note, pid);
    return updateProduct(product)
        .then(function () {
            return emitAssetEvent('ProductNotesEvent');
        })
}

/**
 * @param {org.example.transaction.ProductCreation} tx The new product def
 * @transaction
 */
function createProduct(tx) {
    return getAssetRegistry('org.example.asset.Product')
        .then(function (productRegistry) {
            var factory = getFactory();
            var product = factory.newResource('org.example.asset', 'Product', tx.Name)
            //product.Id = tx.Name;
            product.ProductManager = tx.ProductManager;
            product.Name = tx.Name;
            product.Description = tx.Description;
            product.CreatedDate = tx.CreatedDate;
            product.ExpiryDate = tx.ExpiryDate;
            return productRegistry.add(product);
        })
        .then(function () {
            return emitAssetEvent('ProductCreationEvent');
        })
}

/**
 * @param {org.example.transaction.ProductAssignment} tx The product definition
 * @transaction
 */
function assignPeopleToProduct(tx) {
    var product = tx.Product;
    if (tx.ProductManager)
        product.ProductManager = tx.ProductManager;
    if (tx.MarketingManager)
        product.MarketingManager = tx.MarketingManager;
    if(tx.ShippingManager)
        product.ShippingManager = tx.ShippingManager;
    return updateProduct(product);
}

/**
 * @param {org.example.transaction.ProductDefinition} tx The product definition
 * @transaction
 */
function updateProductDefinition(tx) {
    var product = tx.Product;
    product.Name = tx.Name;
    product.Description = tx.Description;
    product.CreatedDate = tx.CreatedDate;
    product.ExpiryDate = tx.ExpiryDate;
    product.Sku = tx.Sku;
    return updateProduct(product);
}

/**
 * @param {org.example.transaction.ProductPricing} tx The product pricing info
 * @transaction
 */
function updateProductPricing(tx) {
    var pid = getCurrentParticipant().getIdentifier();
    var product = tx.Product;
    product.UnitPrice = tx.UnitPrice;
    addNote(product, tx.Reason, pid);
    return updateProduct(product)
        .then(function (){
            return emitAssetEvent('ProductPricingEvent');
        });
}

/**
 * @param {org.example.transaction.ProductApproval} tx The product approval info 
 * @transaction
 */
function updateProductApproval(tx) {
    var pid = getCurrentParticipant().getIdentifier();
    var product = tx.Product;
    if (product.ProductManager && pid == product.ProductManager.getIdentifier())
        product.ProductManagerApproved = tx.IsApproved;
    else
        throw Error("There is no logic to record your approval");
    
    addNote(product, tx.Reason, pid);

    product.AvailableForSale = product.ProductManagerApproved;
    if (product.AvailableForSale)
        emitAssetEvent('ProductAvailableForSaleEvent');

    return updateProduct(product)
        .then(function (){
            return emitAssetEvent('ProductApprovalEvent');
        });
}

/**
 * @param {org.example.transaction.ProductMarketing} tx The product marketing info
 * @transaction
 */
function updateProductMarketing(tx) {
    var product = tx.Product;
    product.MarketingMaterial = tx.MarketingMaterial;
    product.Tags = tx.Tags;
    return updateProduct(product);
}

/**
 * @param {org.example.transaction.ProductShipment} tx The product shipment info
 * @transaction
 */
function updateProductShipment(tx) {
    var product = tx.Product;
    product.DestinationAddress = tx.DestinationAddress;
    product.DeliveryInstructions = tx.DeliveryInstructions;
    return updateProduct(product);
}

//////////////////////  Helper functions ////////////////////////
function addNote(product, note, author) {
    if (note) {
        var factory = getFactory();
        var n = factory.newConcept('org.example.asset', 'Note');
        n.EffectiveDate = new Date();
        n.Message = note;
        n.Author = author;

        if (!product.Notes)
            product.Notes = [];
        product.Notes.push(n);
    }
}

function updateProduct(product) {
    // Get the asset registry for the asset.
    return getAssetRegistry('org.example.asset.Product')
        .then(function (assetRegistry) {
            // Update the asset in the asset registry.
            return assetRegistry.update(product);
        });
}

function emitAssetEvent(eventName) {
    var factory = getFactory();
    var ev = factory.newEvent('org.example.asset', eventName);
    return emit(ev);
}