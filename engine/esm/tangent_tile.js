// Copyright 2023 the .NET Foundation
// Licensed under the MIT License

// A tile in a pyramid that uses a tangential (gnomonic) projection.

import { ss } from "./ss.js";
import { registerType } from "./typesystem.js";
import { tileCacheRemoveFromQueue, tileDemEnabled, tilePrepDevice, useGlVersion2 } from "./render_globals.js";
import { Vector3d, PositionTexture } from "./double3d.js";
import { WEBGL } from "./graphics/webgl_constants.js";
import { RenderTriangle } from "./render_triangle.js";
import { FitsImage } from "./layers/fits_image.js";
import { Tile } from "./tile.js";


// wwtlib.LatLngEdges

export function LatLngEdges() {
    this.latMin = 0;
    this.latMax = 0;
    this.lngMin = 0;
    this.lngMax = 0;
}

var LatLngEdges$ = {};

registerType("LatLngEdges", [LatLngEdges, LatLngEdges$, null]);


// wwtlib.TangentTile

export function TangentTile(level, x, y, dataset, parent) {
    this._topDown$1 = true;
    Tile.call(this);
    this.parent = parent;
    this.level = level;
    this.tileX = x;
    this.tileY = y;
    this.dataset = dataset;
    this._topDown$1 = !dataset.get_bottomsUp();
    this.computeBoundingSphere();
}

var TangentTile$ = {
    computeBoundingSphere: function () {
        if (!this._topDown$1) {
            this.computeBoundingSphereBottomsUp();
            return;
        }
        var tileDegrees = this.dataset.get_baseTileDegrees() / Math.pow(2, this.level);
        var latMin = (this.dataset.get_baseTileDegrees() / 2 - (this.tileY) * tileDegrees) + this.dataset.get_offsetY();
        var latMax = (this.dataset.get_baseTileDegrees() / 2 - ((this.tileY + 1)) * tileDegrees) + this.dataset.get_offsetY();
        var lngMin = ((this.tileX) * tileDegrees - this.dataset.get_baseTileDegrees() / this.dataset.get_widthFactor()) + this.dataset.get_offsetX();
        var lngMax = (((this.tileX + 1)) * tileDegrees - this.dataset.get_baseTileDegrees() / this.dataset.get_widthFactor()) + this.dataset.get_offsetX();
        var latCenter = (latMin + latMax) / 2;
        var lngCenter = (lngMin + lngMax) / 2;
        this.sphereCenter = this.geoTo3dTan(latCenter, lngCenter);
        this.topLeft = this.geoTo3dTan(latMin, lngMin);
        this.bottomRight = this.geoTo3dTan(latMax, lngMax);
        this.topRight = this.geoTo3dTan(latMin, lngMax);
        this.bottomLeft = this.geoTo3dTan(latMax, lngMin);
        var distVect = this.geoTo3dTan(latMin, lngMin);
        distVect.subtract(this.sphereCenter);
        this.sphereRadius = distVect.length();
    },

    computeBoundingSphereBottomsUp: function () {
        var tileDegrees = this.dataset.get_baseTileDegrees() / Math.pow(2, this.level);
        var latMin = (this.dataset.get_baseTileDegrees() / 2 + ((this.tileY + 1)) * tileDegrees) + this.dataset.get_offsetY();
        var latMax = (this.dataset.get_baseTileDegrees() / 2 + (this.tileY) * tileDegrees) + this.dataset.get_offsetY();
        var lngMin = ((this.tileX) * tileDegrees - this.dataset.get_baseTileDegrees() / this.dataset.get_widthFactor()) + this.dataset.get_offsetX();
        var lngMax = (((this.tileX + 1)) * tileDegrees - this.dataset.get_baseTileDegrees() / this.dataset.get_widthFactor()) + this.dataset.get_offsetX();
        this.topLeft = this.geoTo3dTan(latMin, lngMin);
        this.bottomRight = this.geoTo3dTan(latMax, lngMax);
        this.topRight = this.geoTo3dTan(latMin, lngMax);
        this.bottomLeft = this.geoTo3dTan(latMax, lngMin);
    },

    getLatLngEdges: function () {
        var tileDegrees = this.dataset.get_baseTileDegrees() / Math.pow(2, this.level);
        var edges = new LatLngEdges();
        edges.latMin = (this.dataset.get_baseTileDegrees() / 2 - (this.tileY) * tileDegrees) + this.dataset.get_offsetY();
        edges.latMax = (this.dataset.get_baseTileDegrees() / 2 - ((this.tileY + 1)) * tileDegrees) + this.dataset.get_offsetY();
        edges.lngMin = ((this.tileX) * tileDegrees - this.dataset.get_baseTileDegrees() / this.dataset.get_widthFactor()) + this.dataset.get_offsetX();
        edges.lngMax = (((this.tileX + 1)) * tileDegrees - this.dataset.get_baseTileDegrees() / this.dataset.get_widthFactor()) + this.dataset.get_offsetX();
        return edges;
    },

    // Compute a 3D point at (lat, lng) displaced by altitude metres above the
    // reference surface. We start from the gnomonic position and displace it
    // radially outward by (altitude / demScaleFactor) in WWT world units.
    geoTo3dWithAltitude: function (lat, lng, altitude, useLocalCenter) {
        var base = this.geoTo3dTan(lat, lng);
        var scale = altitude / this.get__demScaleFactor();
        var norm = Math.sqrt(base.x * base.x + base.y * base.y + base.z * base.z);
        if (norm > 1e-12) {
            base.x += (base.x / norm) * scale;
            base.y += (base.y / norm) * scale;
            base.z += (base.z / norm) * scale;
        }
        if (useLocalCenter) {
            base.subtract(this.globalCenter);
        }
        return base;
    },

    geoTo3dTan: function (lat, lng) {
        lng = -lng;
        var fac1 = this.dataset.get_baseTileDegrees() / 2;
        var factor = Math.tan(fac1 * Tile.RC);
        return this.dataset.get_matrix().transform(Vector3d.create(1, (lat / fac1 * factor), (lng / fac1 * factor)));
    },

    // ---------------------------------------------------------------------------
    // DEM support for TangentTile
    //
    // Format: 17×17 little-endian float32 values (289 bytes × 4 = 1156 bytes),
    // stored row-major where row 0 = north edge (tv=0), col 0 = west edge (tu=0).
    // Elevation values are in metres above the reference surface.
    // ---------------------------------------------------------------------------

    _loadDemData: function () {
        if (this.demFile == null) {
            return false;
        }
        if (this.demFile.length !== 289) {
            return false;
        }
        // demFile is already the correct 17×17 grid; alias it as demData so that
        // the shared geoTo3dWithAlt() path in Tile can access it by demIndex.
        this.demData = this.demFile;
        var total = 0;
        for (var i = 0; i < 289; i++) {
            total += this.demFile[i];
        }
        this.demAverage = total / 289;
        return true;
    },

    // Returns the elevation at grid coordinates (xc, yc) where xc/yc ∈ [0,16].
    // Row 0 is north (tv=0); col 0 is west (tu=0).
    _getDemSample: function (xc, yc) {
        var xi = Math.min(16, Math.max(0, Math.round(xc)));
        var yi = Math.min(16, Math.max(0, Math.round(yc)));
        return (this.demData != null) ? this.demData[yi * 17 + xi] : 0;
    },

    requestImage: function () {
        this.fitsImage = ss.safeCast(this.dataset.get_wcsImage(), FitsImage);
        if (this.fitsImage != null) {
            this.texReady = true;
            this.downloading = false;
            this.errored = this.fitsImage.errored;
            this.requestPending = false;
            tileCacheRemoveFromQueue(this.get_key(), true);
            if (useGlVersion2) {
                this.makeTexture();
                this.readyToRender = true;
            }
            else {
                //Cached bitmap for performance reasons
                //Only used in legacy rendering of FITS (WebGL 1.0) inside SkyImageTile
                this.bmp = this.fitsImage.getBitmap();
                this.texture2d = this.bmp.getTexture();
                this.readyToRender = true;
            }
        } else {
            Tile.prototype.requestImage.call(this);
        }
    },

    createGeometry: function (renderContext) {
        if (this.geometryCreated) {
            return true;
        }

        // Load DEM data if it has arrived but not yet been processed.
        if (tileDemEnabled && this.demReady && this.demData == null) {
            this._loadDemData();
        }

        // If elevationModel is requested but DEM hasn't arrived yet, defer.
        if (tileDemEnabled && this.dataset.get_elevationModel() && this.demData == null) {
            return false;
        }

        this.geometryCreated = true;
        for (var i = 0; i < 4; i++) {
            this._renderTriangleLists[i] = [];
        }

        // If DEM data is available, build a fine 17×17 mesh so that per-vertex
        // elevation displacement is visible.  Otherwise fall back to the
        // original coarse 9-vertex mesh.
        var hasDem = tileDemEnabled && this.demData != null && this.demData.length === 289;

        this.globalCenter = this.geoTo3dTan(0, 0);
        var edges = this.getLatLngEdges();

        if (renderContext.gl == null || !hasDem) {
            // --- Original coarse 9-vertex mesh ---
            this.topLeft = this.geoTo3dTan(edges.latMin, edges.lngMin).subtract(this.globalCenter);
            this.bottomRight = this.geoTo3dTan(edges.latMax, edges.lngMax).subtract(this.globalCenter);
            this.topRight = this.geoTo3dTan(edges.latMin, edges.lngMax).subtract(this.globalCenter);
            this.bottomLeft = this.geoTo3dTan(edges.latMax, edges.lngMin).subtract(this.globalCenter);
            var center = Vector3d.midPoint(this.topLeft, this.bottomRight);
            var leftCenter = Vector3d.midPoint(this.topLeft, this.bottomLeft);
            var rightCenter = Vector3d.midPoint(this.topRight, this.bottomRight);
            var topCenter = Vector3d.midPoint(this.topLeft, this.topRight);
            var bottomCenter = Vector3d.midPoint(this.bottomLeft, this.bottomRight);
            if (renderContext.gl == null) {
                this._renderTriangleLists[0].push(RenderTriangle.create(PositionTexture.createPos(this.topLeft, 0, 0), PositionTexture.createPos(leftCenter, 0, 0.5), PositionTexture.createPos(topCenter, 0.5, 0), this.texture, this.level));
                this._renderTriangleLists[0].push(RenderTriangle.create(PositionTexture.createPos(leftCenter, 0, 0.5), PositionTexture.createPos(center, 0.5, 0.5), PositionTexture.createPos(topCenter, 0.5, 0), this.texture, this.level));
                this._renderTriangleLists[1].push(RenderTriangle.create(PositionTexture.createPos(topCenter, 0.5, 0), PositionTexture.createPos(rightCenter, 1, 0.5), PositionTexture.createPos(this.topRight, 1, 0), this.texture, this.level));
                this._renderTriangleLists[1].push(RenderTriangle.create(PositionTexture.createPos(topCenter, 0.5, 0), PositionTexture.createPos(center, 0.5, 0.5), PositionTexture.createPos(rightCenter, 1, 0.5), this.texture, this.level));
                this._renderTriangleLists[2].push(RenderTriangle.create(PositionTexture.createPos(leftCenter, 0, 0.5), PositionTexture.createPos(bottomCenter, 0.5, 1), PositionTexture.createPos(center, 0.5, 0.5), this.texture, this.level));
                this._renderTriangleLists[2].push(RenderTriangle.create(PositionTexture.createPos(leftCenter, 0, 0.5), PositionTexture.createPos(this.bottomLeft, 0, 1), PositionTexture.createPos(bottomCenter, 0.5, 1), this.texture, this.level));
                this._renderTriangleLists[3].push(RenderTriangle.create(PositionTexture.createPos(center, 0.5, 0.5), PositionTexture.createPos(this.bottomRight, 1, 1), PositionTexture.createPos(rightCenter, 1, 0.5), this.texture, this.level));
                this._renderTriangleLists[3].push(RenderTriangle.create(PositionTexture.createPos(center, 0.5, 0.5), PositionTexture.createPos(bottomCenter, 0.5, 1), PositionTexture.createPos(this.bottomRight, 1, 1), this.texture, this.level));
                this.readyToRender = true;
            } else {
                this._vertexBuffer = tilePrepDevice.createBuffer();
                tilePrepDevice.bindBuffer(WEBGL.ARRAY_BUFFER, this._vertexBuffer);
                var f32array = new Float32Array(9 * 5);
                var buffer = f32array;
                var index = 0;
                index = this.addVertex(buffer, index, PositionTexture.createPos(bottomCenter, 0.5, 1));
                index = this.addVertex(buffer, index, PositionTexture.createPos(this.bottomLeft, 0, 1));
                index = this.addVertex(buffer, index, PositionTexture.createPos(this.bottomRight, 1, 1));
                index = this.addVertex(buffer, index, PositionTexture.createPos(center, 0.5, 0.5));
                index = this.addVertex(buffer, index, PositionTexture.createPos(leftCenter, 0, 0.5));
                index = this.addVertex(buffer, index, PositionTexture.createPos(rightCenter, 1, 0.5));
                index = this.addVertex(buffer, index, PositionTexture.createPos(topCenter, 0.5, 0));
                index = this.addVertex(buffer, index, PositionTexture.createPos(this.topLeft, 0, 0));
                index = this.addVertex(buffer, index, PositionTexture.createPos(this.topRight, 1, 0));
                tilePrepDevice.bufferData(WEBGL.ARRAY_BUFFER, f32array, WEBGL.STATIC_DRAW);

                for (var i = 0; i < 4; i++) {
                    index = 0;
                    this.triangleCount = 2;
                    var ui16array = new Uint16Array(this.triangleCount * 3);
                    var indexArray = ui16array;
                    switch (i) {
                        case 0:
                            indexArray[index++] = 7; indexArray[index++] = 4; indexArray[index++] = 6;
                            indexArray[index++] = 4; indexArray[index++] = 3; indexArray[index++] = 6;
                            break;
                        case 1:
                            indexArray[index++] = 6; indexArray[index++] = 5; indexArray[index++] = 8;
                            indexArray[index++] = 6; indexArray[index++] = 3; indexArray[index++] = 5;
                            break;
                        case 2:
                            indexArray[index++] = 4; indexArray[index++] = 0; indexArray[index++] = 3;
                            indexArray[index++] = 4; indexArray[index++] = 1; indexArray[index++] = 0;
                            break;
                        case 3:
                            indexArray[index++] = 3; indexArray[index++] = 2; indexArray[index++] = 5;
                            indexArray[index++] = 3; indexArray[index++] = 0; indexArray[index++] = 2;
                            break;
                    }
                    this._indexBuffers[i] = tilePrepDevice.createBuffer();
                    tilePrepDevice.bindBuffer(WEBGL.ELEMENT_ARRAY_BUFFER, this._indexBuffers[i]);
                    tilePrepDevice.bufferData(WEBGL.ELEMENT_ARRAY_BUFFER, ui16array, WEBGL.STATIC_DRAW);
                }
            }
        } else {
            // --- Fine 17×17 DEM mesh (WebGL only) ---
            // N = 16 intervals → 17 vertices per side → 17*17 = 289 vertices
            // 16*16 = 256 quads, each split into 2 triangles = 512 triangles total.
            // We place all 4 child sub-quads into _renderTriangleLists[0..3].
            var N = 16;
            var numVerts = (N + 1) * (N + 1); // 289
            var latRange = edges.latMin - edges.latMax; // positive (latMin = north = larger)
            var lngRange = edges.lngMax - edges.lngMin; // positive

            this._vertexBuffer = tilePrepDevice.createBuffer();
            tilePrepDevice.bindBuffer(WEBGL.ARRAY_BUFFER, this._vertexBuffer);
            var f32array = new Float32Array(numVerts * 5);
            var buffer = f32array;
            var idx = 0;

            for (var row = 0; row <= N; row++) {
                var tv = row / N;                                    // 0 = north, 1 = south
                var lat = edges.latMin - tv * latRange;              // degrees lat
                for (var col = 0; col <= N; col++) {
                    var tu = col / N;                                // 0 = west, 1 = east
                    var lng = edges.lngMin + tu * lngRange;          // degrees lon
                    var altitude = this.demData[row * 17 + col];     // metres
                    var pos3d;
                    if (altitude !== 0) {
                        pos3d = this.geoTo3dWithAltitude(lat, lng, altitude, true);
                    } else {
                        pos3d = this.geoTo3dTan(lat, lng).subtract(this.globalCenter);
                    }
                    var pt = PositionTexture.createPos(pos3d, tu, tv);
                    idx = this.addVertex(buffer, idx, pt);
                }
            }
            tilePrepDevice.bufferData(WEBGL.ARRAY_BUFFER, f32array, WEBGL.STATIC_DRAW);

            // Build 4 index buffers — one per quadrant (top-left, top-right,
            // bottom-left, bottom-right), each covering N/2 × N/2 quads.
            var half = N / 2; // 8
            for (var qi = 0; qi < 4; qi++) {
                var rowStart = (qi >> 1) * half;        // 0 for qi=0,1; half for qi=2,3
                var colStart = (qi & 1) * half;         // 0 for qi=0,2; half for qi=1,3
                var numQuads = half * half;             // 64 quads per quadrant
                this.triangleCount = numQuads * 2;
                var ui16 = new Uint16Array(this.triangleCount * 3);
                var ii = 0;
                for (var r = rowStart; r < rowStart + half; r++) {
                    for (var c = colStart; c < colStart + half; c++) {
                        var tl = r * (N + 1) + c;
                        var tr = tl + 1;
                        var bl = tl + (N + 1);
                        var br = bl + 1;
                        // triangle 1: tl, bl, tr
                        ui16[ii++] = tl; ui16[ii++] = bl; ui16[ii++] = tr;
                        // triangle 2: tr, bl, br
                        ui16[ii++] = tr; ui16[ii++] = bl; ui16[ii++] = br;
                    }
                }
                this._indexBuffers[qi] = tilePrepDevice.createBuffer();
                tilePrepDevice.bindBuffer(WEBGL.ELEMENT_ARRAY_BUFFER, this._indexBuffers[qi]);
                tilePrepDevice.bufferData(WEBGL.ELEMENT_ARRAY_BUFFER, ui16, WEBGL.STATIC_DRAW);
            }
        }
        return true;
    }
};

registerType("TangentTile", [TangentTile, TangentTile$, Tile]);
