// Copyright (c) 2013, Fabrice Robinet
// All rights reserved.
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are met:
//
//  * Redistributions of source code must retain the above copyright
//    notice, this list of conditions and the following disclaimer.
//  * Redistributions in binary form must reproduce the above copyright
//    notice, this list of conditions and the following disclaimer in the
//    documentation and/or other materials provided with the distribution.
//  * Neither the name of the Motorola Mobility, Inc. nor the names of its
//    contributors may be used to endorse or promote products derived from this
//    software without specific prior written permission.
//
//  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
// AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
// IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
// ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
// DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
// (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
// LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
// ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
// (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
// THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

require("runtime/dependencies/gl-matrix");
var GLSLProgram = require("runtime/glsl-program").GLSLProgram;
var WebGLTFResourceManager = require("runtime/helpers/resource-manager").WebGLTFResourceManager;

var WebGLRendererHelper = Object.create(Object.prototype, {

    _statesFunctionsIndex: { value: null, writable: true },

    allStatesFunctions: { value: ["blendColor", "blendEquationSeparate", "blendFuncSeparate", "colorMask", "cullFace", "depthFunc", "depthMask", "depthRange", "frontFace", "lineWidth", "polygonOffset",  "scissor"], writable: false },

    
    defaultFunctionsArgs: { 
        value: {
            "blendColor": [0.0, 0.0, 0.0, 0.0],
            "blendEquationSeparate" : [WebGLRenderingContext.FUNC_ADD, WebGLRenderingContext.FUNC_ADD],
            "blendFuncSeparate" : [WebGLRenderingContext.ONE, WebGLRenderingContext.ONE, WebGLRenderingContext.ZERO, WebGLRenderingContext.ZERO], 
            "colorMask" : [true, true, true, true], 
            "cullFace" : [WebGLRenderingContext.BACK],
            "depthFunc" : [WebGLRenderingContext.LESS],
            "depthMask" : [true],
            "depthRange" : [0.0, 1.0],
            "frontFace" : [WebGLRenderingContext.CCW],
            "lineWidth" : [1.0],
            "polygonOffset" : [0.0, 0.0], 
            "scissor" : [0, 0, 0, 0]
        }, writable : false
    },

    allEnablableStates: { value: [WebGLRenderingContext.BLEND, WebGLRenderingContext.CULL_FACE, WebGLRenderingContext.DEPTH_TEST, WebGLRenderingContext.POLYGON_OFFSET_FILL, WebGLRenderingContext.SAMPLE_ALPHA_TO_COVERAGE, WebGLRenderingContext.SCISSOR_TEST], writable: false },

    statesFunctionsIndex: { 
        get: function() {
            if (!this._statesFunctionsIndex) {
                this._statesFunctionsIndex = {};
                for (var i = 0 ; i < this.allStatesFunctions.length ; i++) {
                    this._statesFunctionsIndex[this.allStatesFunctions[i]] = i;
                }
            }
            return this._statesFunctionsIndex;
        }
    }
});

/*//FIXME:
//http://stackoverflow.com/questions/7837456/comparing-two-arrays-in-javascript
if (!Array.prototype.equals) {
                // attach the .equals method to Array's prototype to call it on any array
                Array.prototype.equ    _statesFunctionsIndex: { value: null, writable: true },
als = function (array) {
                    // if the other array is a falsy value, return
                    if (!array)
                        return false;
                    if (this.length != array.length)
                        return false;
                    var l = this.length;
                    for (var i = 0, l; i < l; i++) {
                        // Check if we have nested arrays
                        if (this[i] instanceof Array && array[i] instanceof Array) {
                            // recurse into the nested arrays
                            if (!this[i].equals(array[i]))
                                return false;       
                        } else if (this[i] != array[i]) { 
                            // Warning - two different object instances will never be equal: {x:20} != {x:20}
                            return false;   
                        }              
                    }       
                    return true;
                }   
            }
*/

var WebGLRenderer = exports.WebGLRenderer = Object.create(Object.prototype, {

    MODEL: { value: "MODEL", writable: false},
    VIEW: { value: "VIEW", writable: false},
    PROJECTION: { value: "PROJECTION", writable: false},
    MODELVIEW: { value: "MODELVIEW", writable: false},
    VIEWPROJECTION: { value: "VIEWPROJECTION", writable: false},
    MODELVIEWPROJECTION: { value: "MODELVIEWPROJECTION", writable: false},
    MODELINVERSE: { value: "MODELINVERSE", writable: false},
    VIEWINVERSE: { value: "VIEWINVERSE", writable: false},
    PROJECTIONINVERSE: { value: "PROJECTIONINVERSE", writable: false},
    MODELVIEWINVERSE: { value: "MODELVIEWINVERSE", writable: false},
    VIEWPROJECTIONINVERSE: { value: "VIEWPROJECTIONINVERSE", writable: false},
    MODELVIEWPROJECTIONINVERSE: { value: "MODELVIEWPROJECTIONINVERSE", writable: false},
    MODELTRANSPOSE: { value: "MODELTRANSPOSE", writable: false},
    VIEWTRANSPOSE: { value: "VIEWTRANSPOSE", writable: false},
    PROJECTIONTRANSPOSE: { value: "PROJECTIONTRANSPOSE", writable: false},
    MODELVIEWTRANSPOSE: { value: "MODELVIEWTRANSPOSE", writable: false},
    VIEWPROJECTIONTRANSPOSE: { value: "VIEWPROJECTIONTRANSPOSE", writable: false},
    MODELVIEWPROJECTIONTRANSPOSE: { value: "MODELVIEWPROJECTIONTRANSPOSE", writable: false},
    MODELINVERSETRANSPOSE: { value: "MODELINVERSETRANSPOSE", writable: false},
    VIEWINVERSETRANSPOSE: { value: "VIEWINVERSETRANSPOSE", writable: false},
    PROJECTIONINVERSETRANSPOSE: { value: "PROJECTIONINVERSETRANSPOSE", writable: false},
    MODELVIEWINVERSETRANSPOSE: { value: "MODELVIEWINVERSETRANSPOSE", writable: false},
    VIEWPROJECTIONINVERSETRANSPOSE: { value: "VIEWPROJECTIONINVERSETRANSPOSE", writable: false},
    MODELVIEWPROJECTIONINVERSETRANSPOSE: { value: "MODELVIEWPROJECTIONINVERSETRANSPOSE", writable: false},

    //private accessors
    _bindedProgram: { value: null, writable: true },

    _debugProgram: { value: null, writable: true },

    _resourceManager: { value: null, writable: true },

    _webGLContext: { value : null, writable: true },

    _projectionMatrix: { value : null, writable: true },

    //default values
    shininess: { value: 200, writable: true },

    light: { value: [0, 0, -1], writable: true },

    specularColor: { value: [1, 1, 1], writable: true },

    initWithWebGLContext: {
        value: function(value) {
            this.webGLContext = value;
            this._states = {};
            this._statesEnabled = {};
            this._functionsArgs = {};
            return this;
        }
    },

    bindedProgram: {
        get: function() {
            return this._bindedProgram;
        },
        set: function(value) {
            if ((this._bindedProgram !== value) && this._webGLContext) {
                this._bindedProgram = value;
                if (this._bindedProgram) {
                    this._bindedProgram.use(this._webGLContext, false);
                }
            }
        }
    },

    projectionMatrix: {
        get: function() {
            return this._projectionMatrix;
        },
        set: function(value) {
            this._projectionMatrix = value;
        }
    },

    //FIXME:needs to be updated to reflect latest changes
    debugProgram: {
        get: function() {
            if (!this._debugProgram) {
                this._debugProgram = Object.create(GLSLProgram);
                
                var vertexShader = "precision highp float;"+
                "attribute vec3 a_position;"+
                "attribute vec3 a_normal;"+
                "varying vec3 v_normal;"+
                "uniform mat3 u_normalMatrix;"+
                "uniform mat4 u_modelViewMatrix;"+
                "uniform mat4 u_projectionMatrix;"+
                "attribute vec2 a_texcoord0;"+
                "varying vec2 v_texcoord0;"+
                "void main(void) {"+
                "vec4 pos = u_modelViewMatrix * vec4(a_position,1.0);"+
                "v_normal = u_normalMatrix * a_normal;"+
                "v_texcoord0 = a_texcoord0;"+
                "gl_Position = u_projectionMatrix * pos;"+
                "}";

                var fragmentShader=
                "precision highp float;"+
                "varying vec3 v_normal;"+
                "varying vec2 v_texcoord0;"+
                "uniform sampler2D u_diffuse;"+
                "uniform vec4 u_emission;"+
                "uniform float u_shininess;"+
                "void main(void) {"+
                "vec4 scol = vec4(0.8, 0.8, 1, 0.5);"+
                "vec4 color = vec4(0., 0., 0., 0.);"+
                "vec4 diffuse = vec4(0., 0., 0., 1.);"+
                "vec4 emission;"+
                "diffuse = texture2D(u_diffuse, v_texcoord0);"+
                "emission = u_emission;"+
                "color.xyz += diffuse.xyz;"+
                "color.xyz += emission.xyz;"+
                "color = vec4(0.45*color.g,0.45*color.g,0.45*color.b+(color.r+color.g+color.b)/3.0*0.55,1);"+
                "gl_FragColor = color;"+
                "}";
                
            	this._debugProgram.initWithShaders( {    "x-shader/x-vertex" : vertexShader ,"x-shader/x-fragment" : fragmentShader } );
                if (!this._debugProgram.build(this.webGLContext)) {
                    console.error(this._debugProgram.errorLogs);
                }

            }

            return this._debugProgram;
        }
    },

    webGLContext: {
        get: function() {
            return this._webGLContext;
        },
        set: function(value) {
            this._webGLContext = value;
        }
    },

    resourceManager: {
        get: function() {
            if (!this._resourceManager) {
                //FIXME: this should be in init
                this._resourceManager = Object.create(WebGLTFResourceManager);
                this._resourceManager.init();
            }

            return this._resourceManager;
        }
    },

    indicesDelegate: {
        value: {
            webGLContext:  {
                value: null, writable: true
            },

            handleError: function(errorCode, info) {
                // FIXME: report error
                console.log("ERROR:vertexAttributeBufferDelegate:"+errorCode+" :"+info);
            },

            //should be called only once
            convert: function (source, resource, ctx) {
                var gl = ctx;
                var previousBuffer = gl.getParameter(gl.ELEMENT_ARRAY_BUFFER_BINDING);
                var glResource =  gl.createBuffer();
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, glResource);
                gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, resource, gl.STATIC_DRAW);
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, previousBuffer);
                return glResource;
            },

            resourceAvailable: function (glResource, ctx) {
            }
        }
    },

    setupCompressedMesh: {
        value: function(mesh, attribs, indices) {
            var primitive = mesh.primitives[0];

            var gl = this.webGLContext;
            //create indices
            var previousBuffer = gl.getParameter(gl.ELEMENT_ARRAY_BUFFER_BINDING);
            var glResource =  gl.createBuffer();
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, glResource);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, previousBuffer);

            glResource.count = indices.length;
            this.resourceManager.setResource(primitive.indices.id, glResource);
            primitive.indices = { "id" : primitive.indices.id, "count" : glResource.count }; //HACK

            //deinterleave for now, I now it is a bad and this will not be needed anymore soon
            var count = attribs.length / 8;     //8 = (3pos + 2uv + 3normals)

            var positions = new Float32Array(count * 3);
            var normals = new Float32Array(count * 3);
            var texcoords = new Float32Array(count * 2);

            var i;
            for (i = 0 ; i < count ; i++) {
                var idx = i * 8;
                positions[(i*3) + 0] = attribs[idx + 0];
                positions[(i*3) + 1] = attribs[idx + 1];
                positions[(i*3) + 2] = attribs[idx + 2];
                normals[(i*3) + 0] = attribs[idx + 5];
                normals[(i*3) + 1] = attribs[idx + 6];
                normals[(i*3) + 2] = attribs[idx + 7];
                texcoords[(i*2) + 0] = attribs[idx + 3];
                texcoords[(i*2) + 1] = attribs[idx + 4];
            }

            previousBuffer = gl.getParameter(gl.ARRAY_BUFFER_BINDING);

            glResource =  gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, glResource);
            gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
            glResource.componentType = gl.FLOAT;
            glResource.componentsPerAttribute = 3;

            this.resourceManager.setResource(primitive.semantics["POSITION"].id, glResource);
            primitive.semantics["POSITION"] = { "id" : primitive.semantics["POSITION"].id , "count" : count, "byteStride" : 12}; //HACK


            glResource =  gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, glResource);
            gl.bufferData(gl.ARRAY_BUFFER, normals, gl.STATIC_DRAW);
            glResource.componentType = gl.FLOAT;
            glResource.componentsPerAttribute = 3;

            this.resourceManager.setResource(primitive.semantics["NORMAL"].id, glResource);
            primitive.semantics["NORMAL"] = { "id" : primitive.semantics["NORMAL"].id, "count" : count, "byteStride" : 12}; //HACK

            if (texcoords.length > 0) {
                glResource =  gl.createBuffer();
                gl.bindBuffer(gl.ARRAY_BUFFER, glResource);
                gl.bufferData(gl.ARRAY_BUFFER, texcoords, gl.STATIC_DRAW);
                glResource.componentType = gl.FLOAT;
                glResource.componentsPerAttribute = 2;
                this.resourceManager.setResource(primitive.semantics["TEXCOORD_0"].id, glResource);
                primitive.semantics["TEXCOORD_0"] = { "id" : primitive.semantics["TEXCOORD_0"].id, "count" : count, "byteStride" : 8}; //HACK
            }

            gl.bindBuffer(gl.ARRAY_BUFFER, previousBuffer);


        }
    },

    setupCompressedMesh2: {
        value: function(mesh, vertexCount, positions, normals, ifs, floatAttributesIndexes, indices) {
            var gl = this.webGLContext;
            //create indices
            //var previousBuffer = gl.getParameter(gl.ELEMENT_ARRAY_BUFFER_BINDING);

            var count = 0;
            var index = 0;
            var primitives = mesh.primitives;

            //setup indices
            for (var i = 0 ; i < primitives.length ; i++) {
                //First we set the indices
                var primitive = mesh.primitives[i];
                var id = primitive.indices.id;
                count = primitive.indices.count;
                var primitiveIndices = new Int16Array(indices.subarray(index, index + count ));

                var glResource =  gl.createBuffer();
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, glResource);
                gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, primitiveIndices, gl.STATIC_DRAW);

                this.resourceManager.setResource(id, glResource);
                glResource.count = count;
                primitive.indices = { "id" : id, "count" : glResource.count };
                index += count;
                //Then we setup vertex attributes with potentially multiple set, like color and texcoord
            }

            var semantic;
            var idToSemantic = {};
            //now setup vertex attributes, to do so we build a map of id->vertexAttribute for all used sources in the mesh
            for (var i = 0 ; i < primitives.length ; i++) {
                //First we set the indices
                var primitive = mesh.primitives[i];
                for (semantic in primitive.semantics) {
                    var vertexAttribute = primitive.semantics[semantic];
                    idToSemantic[vertexAttribute.baseId] = semantic;
                }
            }

            for (var attributeId in idToSemantic) {
                var vertexAttributeIndex = floatAttributesIndexes[attributeId];
                if (vertexAttributeIndex != null) {
                    var attr = ifs.GetFloatAttribute(vertexAttributeIndex);
                    var semantic = idToSemantic[attributeId];
                    if (semantic === "JOINT") {
                        for (var k = 0 ; k < attr.length ; k++) {
                            attr[k] = Math.floor(attr[k] + 0.5);
                        }
                    }

                    var componentsPerAttribute =ifs.GetFloatAttributeDim(vertexAttributeIndex);
                    glResource =  gl.createBuffer();
                    gl.bindBuffer(gl.ARRAY_BUFFER, glResource);
                    gl.bufferData(gl.ARRAY_BUFFER, attr, gl.STATIC_DRAW);
                    glResource.componentType = gl.FLOAT;
                    glResource.componentsPerAttribute = componentsPerAttribute;
                    this.resourceManager.setResource(primitive.semantics[semantic].id, glResource);
                    primitive.semantics[semantic] = { "id" : primitive.semantics[semantic].id, "count" : count, "byteStride" : componentsPerAttribute * 4};
                }
            }

            //if (previousBuffer)
            //    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER_BINDING, previousBuffer);

            count = vertexCount;
            previousBuffer = gl.getParameter(gl.ARRAY_BUFFER_BINDING);

            glResource =  gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, glResource);
            gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
            glResource.componentType = gl.FLOAT;
            glResource.componentsPerAttribute = 3;

            this.resourceManager.setResource(primitive.semantics["POSITION"].id, glResource);
            primitive.semantics["POSITION"] = { "id" : primitive.semantics["POSITION"].id , "count" : count, "byteStride" : 12}; //HACK

            if (normals != null) {
                glResource =  gl.createBuffer();
                gl.bindBuffer(gl.ARRAY_BUFFER, glResource);
                gl.bufferData(gl.ARRAY_BUFFER, normals, gl.STATIC_DRAW);
                glResource.componentType = gl.FLOAT;
                glResource.componentsPerAttribute = 3;
                this.resourceManager.setResource(primitive.semantics["NORMAL"].id, glResource);
                primitive.semantics["NORMAL"] = { "id" : primitive.semantics["NORMAL"].id, "count" : count, "byteStride" : 12}; //HACK
            }

            gl.bindBuffer(gl.ARRAY_BUFFER, previousBuffer);
        }
    },

    vertexAttributeBufferDelegate: {
        value: {

            //only performed once per vertexAttribute
            _componentsPerElementForType: function(type) {
                switch (type) {
                    case "SCALAR":
                        return 1;
                    case "VEC2":
                        return 2;
                    case "VEC3":
                        return 3;
                    case "VEC4":
                    case "MAT2":
                        return 4;
                    case "MAT3":
                        return 9;
                    case "MAT4":
                        return 16;
                    default:
                        return null;
                }
            },

            webGLContext:  {
                value: null, writable: true
            },

            handleError: function(errorCode, info) {
                console.log("ERROR:vertexAttributeBufferDelegate:"+errorCode+" :"+info);
            },

            convert: function (source, resource, ctx) {
                var attribute = source;
                var gl = ctx;
                var previousBuffer = gl.getParameter(gl.ARRAY_BUFFER_BINDING);

                var glResource =  gl.createBuffer();
                gl.bindBuffer(gl.ARRAY_BUFFER, glResource);
                //FIXME: use bufferSubData to prevent alloc
                gl.bufferData(gl.ARRAY_BUFFER, resource, gl.STATIC_DRAW);
                glResource.componentType = attribute.componentType;
                glResource.componentsPerAttribute = this._componentsPerElementForType(attribute.type);
                gl.bindBuffer(gl.ARRAY_BUFFER, previousBuffer);
                return glResource;
            },

            resourceAvailable: function (glResource, ctx) {
            }
        }
    },

    textureDelegate: {
        value: {
            getGLFilter: function(filter) {
                return filter == null ? WebGLRenderingContext.LINEAR : filter;
            },

            getGLWrapMode: function(wrapMode) {
                return wrapMode == null ? WebGLRenderingContext.REPEAT : wrapMode;
            },

            handleError: function(errorCode, info) {
                // FIXME: report error
                console.log("ERROR:textureDelegate:"+errorCode+" :"+info);
            },

            //nextHighestPowerOfTwo && isPowerOfTwo borrowed from http://www.khronos.org/webgl/wiki/WebGL_and_OpenGL_Differences
            nextHighestPowerOfTwo: function (x) {
                --x;
                for (var i = 1; i < 32; i <<= 1) {
                    x = x | x >> i;
                }
                return x + 1;
            },

            isPowerOfTwo: function(x) {
                return (x & (x - 1)) == 0;
            },

            installCubemapSide: function(gl, target, texture, content) {
                gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
                gl.texImage2D(target, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, content);
                gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
            },

            createTextureFromImageAndSampler: function(image, sampler, gl) {
                var activeTexture = gl.getParameter(gl.ACTIVE_TEXTURE);
                var textureBinding = gl.getParameter(gl.TEXTURE_BINDING_2D);
                gl.activeTexture(gl.TEXTURE0);

                var canvas = null;
                var minFilter = this.getGLFilter(sampler.minFilter);
                var magFilter = this.getGLFilter(sampler.magFilter);
                var wrapS = this.getGLWrapMode(sampler.wrapS);
                var wrapT = this.getGLWrapMode(sampler.wrapT);
                var shouldResize = false;
                var usesMipMaps = ((minFilter === gl.NEAREST_MIPMAP_NEAREST) ||
                    (minFilter === gl.LINEAR_MIPMAP_NEAREST) ||
                    (minFilter === gl.NEAREST_MIPMAP_LINEAR) ||
                    (minFilter === gl.LINEAR_MIPMAP_LINEAR));

                if (usesMipMaps ||  (wrapS === gl.REPEAT) || (wrapT === gl.REPEAT)) {
                    var width = parseInt(image.width);
                    var height = parseInt(image.height);

                    if (!this.isPowerOfTwo(width)) {
                        width = this.nextHighestPowerOfTwo(width);
                        shouldResize = true;
                    }
                    if (!this.isPowerOfTwo(height)) {
                        height = this.nextHighestPowerOfTwo(height);
                        shouldResize = true;
                    }

                    if (shouldResize) {
                        canvas = document.createElement("canvas");
                        canvas.width = width;
                        canvas.height = height;

                        var graphicsContext = canvas.getContext("2d");
                        graphicsContext.drawImage(image, 0, 0, parseInt(canvas.width), parseInt(canvas.height));
                        canvas.id = image.id;
                        image = canvas;
                    }
                }


                var texture = gl.createTexture();
                texture.contextID = gl.contextID;

                gl.bindTexture(gl.TEXTURE_2D, texture);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrapS);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrapT);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, minFilter);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, magFilter);
                
                /*
                var extensions = gl.getSupportedExtensions();
                var ext = gl.getExtension("WEBKIT_EXT_texture_filter_anisotropic");
                var max_anisotropy = gl.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
                gl.texParameterf(gl.TEXTURE_2D, ext.TEXTURE_MAX_ANISOTROPY_EXT, max_anisotropy);
                */

                //FIXME: use from input texture (target, format, internal format)
                //gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
                if (usesMipMaps) {
                    gl.generateMipmap(gl.TEXTURE_2D);
                }

                gl.bindTexture(gl.TEXTURE_2D, textureBinding);
                gl.activeTexture(activeTexture);


                return texture;
            },

            //should be called only once
            convert: function (source, resource, ctx) {
                var gl = ctx;
                if (source) {
                    if (source.length === 6) {
                        //we must have a cube map here:
                        var cubeTexture = gl.createTexture();
                        gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeTexture);
                        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

                        this.installCubemapSide(gl, gl.TEXTURE_CUBE_MAP_POSITIVE_X, cubeTexture, source[0]);
                        this.installCubemapSide(gl, gl.TEXTURE_CUBE_MAP_NEGATIVE_X, cubeTexture, source[1]);
                        this.installCubemapSide(gl, gl.TEXTURE_CUBE_MAP_POSITIVE_Y, cubeTexture, source[2]);
                        this.installCubemapSide(gl, gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, cubeTexture, source[3]);
                        this.installCubemapSide(gl, gl.TEXTURE_CUBE_MAP_POSITIVE_Z, cubeTexture, source[4]);
                        this.installCubemapSide(gl, gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, cubeTexture, source[5]);

                        return cubeTexture;
                    }

                } else if (source.type == "video") {
                    //for now, naive handling of videos
                    resource.source.videoElement = source;
                    var texture = gl.createTexture();
                    gl.bindTexture(gl.TEXTURE_2D, texture);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, resource.source.videoElement);
                    gl.bindTexture(gl.TEXTURE_2D, null);
                    return texture;
                }

                return this.createTextureFromImageAndSampler(source, resource.sampler, gl);
            },

            resourceAvailable: function (glResource, ctx) {
            }
        }
    },

    _lastMaxEnabledArray: { value: 0, writable: true },

    _states: { value: null, writable: true },

    setState: {
        value: function(stateID, flag, force) {
            var gl = this.webGLContext;
            if ((this._states[stateID] != null) && (force != true)) {
                if (this._states[stateID] === flag) {
                    return;
                }
            }

            this._states[stateID] = flag;

            if (flag) {
                gl.enable(stateID);
            } else {
                gl.disable(stateID);
            }
        }
    },

    updateEnabledStates: {
        value: function(gl, statesEnabled, force) {
            if (statesEnabled != null) {
                var length = statesEnabled.length;
                var stateID;
                for (var i = 0; i < length; ++i) {
                    stateID = statesEnabled[i];
                    if ((this._statesEnabled[stateID] == false) || force) {
                        this._statesEnabled[stateID] = true;
                        gl.enable(stateID);
                    }
                }
            }
        }
    },

    _restoreDefaultEnabledStatesIfAbsent: {
        value: function(gl, statesEnabled, force) {
            if (statesEnabled == null) return;

            var allEnablableStates = WebGLRendererHelper.allEnablableStates;
            var length = allEnablableStates.length;
            var stateID;
            for (var i = 0 ; i < length; ++i) {
                stateID = allEnablableStates[i];
                if ((statesEnabled[stateID] == null) && 
                    ((this._statesEnabled[stateID] == true) || (this._statesEnabled[stateID] == null))
                     || force) {
                    gl.disable(stateID);
                    this._statesEnabled[stateID] = false;
                }
            }
        }
    },

    _restoreDefaultEnabledStates: {
        value: function(gl, statesEnabled, force) {
            var allEnablableStates = WebGLRendererHelper.allEnablableStates;
            var length = allEnablableStates.length;
            var stateID;
            for (var i = 0 ; i < length; ++i) {
                stateID = allEnablableStates[i];
                if (((this._statesEnabled[stateID] != null) && 
                    (this._statesEnabled[stateID] == true))
                     || force) {
                    gl.disable(stateID);
                    this._statesEnabled[stateID] = false;
                }
            }
        }
    },

    _restoreDefaultFunctionsArgsIfAbsent: {
        value: function(gl, functions, force) {
            if (functions == null) return;
            var allStatesFunctions = WebGLRendererHelper.allStatesFunctions;
            var statesFunctionsIndex = WebGLRendererHelper.statesFunctionsIndex;
            var length = allStatesFunctions.length;
            for (var i =  0 ; i < length ; i++) {
                var func = allStatesFunctions[i];
                var functionIndex = statesFunctionsIndex[func];

                //if the function is not contained within "functions" it means we won't invoke it
                //so we want to make sure its arguments are set to the default value
                if (!functions[functionIndex]) {
                    var args = this._functionsArgs[func];
                    if (args) {
                        var defaultArgs = WebGLRendererHelper.defaultFunctionsArgs[func];
                        if (defaultArgs) {
                            if (defaultArgs.length != args.length) {
                                console.log("_restoreDefaultFunctionsArgsIfAbsent:inconsistent arguments length");
                            } else {
                                var needsUpdate = false | force;
                                for (var k = 0 ; k < length ; k++) {
                                    if (defaultArgs[k] != args[k]) {
                                        needsUpdate = true;
                                        args[k] = defaultArgs[k];
                                    }
                                }
                                if (needsUpdate) {
                                    this._functionsSwitch[functionIndex](gl, defaultArgs);
                                }
                            }
                        }
                    }
                }
            }
        }
    },

    _restoreDefaultFunctionsArgs: {
        value: function(gl, force) {
            var statesFunctionsIndex = WebGLRendererHelper.statesFunctionsIndex;

            for (var func in this._functionsArgs) {
                var args = this._functionsArgs[func];
                var defaultArgs = WebGLRendererHelper.defaultFunctionsArgs[func];
                var length = args.length;
                var needsUpdate = true;
                var forcing = (force != null) && (force != true);
                if (forcing) {
                    for (var k = 0 ; k < length ; k++) {
                        if (defaultArgs[k] != args[k]) {
                            needsUpdate = true;
                            args[k] = defaultArgs[k];
                        }
                    }
                }
                if (needsUpdate || forcing) {
                    var functionIndex = statesFunctionsIndex[func];
                    if (defaultArgs)
                        this._functionsSwitch[functionIndex](gl, defaultArgs);
                }
            }
        }
    },

    updateFunctionsStates: {
        value: function(gl, functions) {
            if (functions) {
                var func;
                var args;
                var argsLength;
                var previousArgs;
                var statesFunctionsIndex = WebGLRendererHelper.statesFunctionsIndex;
                var needsUpdate = false;
                var i;

                if (!functions) return;

                for (func in functions) {
                    args = functions[func];
                    argsLength = args.length;
                    previousArgs = this._functionsArgs[func];
                    if (previousArgs == null) {
                        needsUpdate = true;
                    } else {
                        for (i = 0 ; i < argsLength ; i++) {
                            if (args[i] != previousArgs[i]) {
                                needsUpdate = true;
                                previousArgs[i] = args[i];
                            }
                        }
                    }
                    if (needsUpdate) {
                        this._functionsSwitch[statesFunctionsIndex[func]](gl, args);
                        if (previousArgs == null) {
                            var nvArgs = [];
                            this._functionsArgs[func] = nvArgs;
                            for (i = 0 ; i < argsLength ; i++) {
                                nvArgs.push(args[i]);
                            }
                        } 
                    }
                }
            }
        }
    },

    resetStates : {
        value: function() {
            var gl = this.webGLContext;
            if (gl && (this._lastMaxEnabledArray !== -1)) {
                for (var i = 0 ; i < this._lastMaxEnabledArray ; i++) {
                    gl.disableVertexAttribArray(i);
                }
            }
            this._lastMaxEnabledArray = -1;
            this.bindedProgram = null;
        }
    },

    _statesFunctionsIndex: { 
        get: function() {
            return WebGLRendererHelper.statesFunctionsIndex;
        }
    },

    _functionsSwitch: {
        value: (function () {
            var functionsSwitch = [];
            var statesFunctionsIndex = WebGLRendererHelper.statesFunctionsIndex;
            functionsSwitch[statesFunctionsIndex["blendColor"]] = function blendColor(GL, args) {
                GL.blendColor(args[0], args[1], args[2], args[3]);
            };
            functionsSwitch[statesFunctionsIndex["blendEquationSeparate"]] = function blendEquationSeparate(GL, args) {
                GL.blendEquationSeparate(args[0], args[1]);
            };
            functionsSwitch[statesFunctionsIndex["blendFuncSeparate"]] = function blendFuncSeparate(GL, args) {
                GL.blendFuncSeparate(args[0], args[1], args[2], args[3]);
            };
            functionsSwitch[statesFunctionsIndex["colorMask"]] = function colorMask(GL, args) {
                GL.colorMask(args[0], args[1], args[2], args[3]);
            };
            functionsSwitch[statesFunctionsIndex["cullFace"]] = function cullFace(GL, args) {
                GL.cullFace(args[0]);
            };
            functionsSwitch[statesFunctionsIndex["depthFunc"]] = function depthFunc(GL, args) {
                GL.depthFunc(args[0]);
            };
            functionsSwitch[statesFunctionsIndex["depthMask"]] = function depthMask(GL, args) {
                GL.depthMask(args[0]);
            };
            functionsSwitch[statesFunctionsIndex["depthRange"]] = function depthRange(GL, args) {
                GL.depthRange(args[0], args[1]);
            };
            functionsSwitch[statesFunctionsIndex["frontFace"]] = function frontFace(GL, args) {
                GL.frontFace(args[0]);
            };
            functionsSwitch[statesFunctionsIndex["lineWidth"]] = function lineWidth(GL, args) {
                GL.lineWidth(args[0]);
            };
            functionsSwitch[statesFunctionsIndex["polygonOffset"]] = function polygonOffset(GL, args) {
                GL.polygonOffset(args[0], args[1]);
            };
            functionsSwitch[statesFunctionsIndex["scissor"]] = function scissor(GL, args) {
                GL.scissor(args[0], args[1], args[2], args[3]);
            };
            return functionsSwitch;
        })()
    },

    _statesEnabled: { value: null, writable: true },

    _functionsArgs: { value: null, writable: true },

    _restoreDefaultGLStates: {
        value: function(gl) {
            this._restoreDefaultEnabledStates(gl, true);
            this._restoreDefaultFunctionsArgs(gl, true);
        }
    },

    renderPrimitive: {
        value: function(primitiveDescription, pass, time, parameters) {
            
            var renderVertices = false;
            var value = null;
            var primitive = primitiveDescription.primitive;

            //temporary fix 
            if (primitiveDescription.node) {
                if (primitiveDescription.node.instanceSkin) {
                    primitiveDescription.node.instanceSkin.skin.process(primitiveDescription.node, this.resourceManager);
                }
            }

            var newMaxEnabledArray = -1;
            var gl = this.webGLContext;
            var program =  this.bindedProgram;
            //console.log("NODE : "+primitiveDescription.node.id);
            //console.log(primitiveDescription.parent.node);
            //-------------------------
            // CUSTOM HACK
            //window.SELECTED="Cube";
            //console.log(primitiveDescription.node.name);
            if (typeof window.SELECTED != "undefined" && primitiveDescription && primitiveDescription.node && primitiveDescription.node.name == window.SELECTED) {
                window.OLDPRG=1;
            	program =  this.debugProgram;
                program.use(this._webGLContext, false);
            } else {
            	if (window.OLDPRG != 0) 
            		program.use(this._webGLContext, false);
                window.OLDPRG=0;
            }
            //-------------------------
            var i;
            var currentTexture = 0;
            if (!parameters)
                parameters = primitive.material.parameters;
            var allUniforms = program.uniformSymbols;
            for (i = 0; i < allUniforms.length ; i++) {
                var symbol = allUniforms[i];
                var parameter = pass.instanceProgram.uniforms[symbol];

                value = null;
                parameter = parameters[parameter];
                if (parameter) {
                    if (parameter.semantic != null) {
                        var nodeWrapper = primitiveDescription.nodeWrapper;
                        if (parameter.source) {
                            nodeWrapper = primitiveDescription.nodeWrapper.scenePassRenderer._nodeWrappers[parameter.source.id]
                        }

                        var semantic = parameter.semantic;
                        if (semantic === this.PROJECTION) {
                            value = this.projectionMatrix;
                        } else if (semantic === this.MODELVIEW) {
                            value = nodeWrapper.worldViewMatrix;
                        } else if (semantic === this.MODELVIEWINVERSETRANSPOSE) {
                            value = nodeWrapper.worldViewInverseTransposeMatrix;
                        } else if (semantic === this.MODELVIEWINVERSE) {
                            value = nodeWrapper.worldViewInverseMatrix;
                        }
                    }
                }

                if ((value == null) && parameter != null) {
                    if ((parameter.source) && (semantic == null)) {
                        var nodeWrapper = primitiveDescription.nodeWrapper.scenePassRenderer._nodeWrappers[parameter.source.id];
                        value = nodeWrapper.worldViewMatrix;
                    } else {
                        value = parameter.value;
                    }
                }

                var texture = null;

                if (value != null) {
                    var glType = program.getTypeForSymbol(symbol);
                    var uniformIsSamplerCube = glType === gl.SAMPLER_CUBE;
                    var uniformIsSampler2D = glType === gl.SAMPLER_2D;

                    if (uniformIsSamplerCube) {
                        texture = this.resourceManager.getResource(value, this.textureDelegate, this.webGLContext);
                        if (texture) {
                            gl.activeTexture(gl.TEXTURE0 + currentTexture);
                            gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);

                            var samplerLocation = program.getLocationForSymbol(symbol);
                            if (typeof samplerLocation !== "undefined") {
                                program.setValueForSymbol(symbol, currentTexture);
                                currentTexture++;
                            }
                        }
                    } else if (uniformIsSampler2D) {
                        texture = this.resourceManager.getResource(value, this.textureDelegate, this.webGLContext);
                        if (texture != null) {
                            //HACK: to keep track of texture
                            gl.activeTexture(gl.TEXTURE0 + currentTexture);
                            gl.bindTexture(gl.TEXTURE_2D, texture);
                            if (parameter.value.source.videoElement) {
                                if (parameter.value.source.timeStamp != time) {
                                    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA,
                                        gl.UNSIGNED_BYTE, parameter.value.source.videoElement);
                                    parameter.value.source.timeStamp = time;
                                }
                            }

                            var samplerLocation = program.getLocationForSymbol(symbol);
                            if (typeof samplerLocation !== "undefined") {
                                program.setValueForSymbol(symbol, currentTexture);
                                currentTexture++;
                            } 
                        } 

                    } else {
                        program.setValueForSymbol(symbol, value);
                    }
                }
            }

            program.commit(gl);

            var availableCount = 0;

            //----- bind attributes -----
            var attributes = pass.instanceProgram.attributes;
            var allAttributes = program.attributeSymbols;
            for (i = 0 ; i < allAttributes.length ; i++) {
                var symbol = allAttributes[i];
                var parameter = attributes[symbol];
                parameter = parameters[parameter];
                if (!parameter)
                	continue;
                	
                var semantic = parameter.semantic;
                var accessor = primitive.semantics[semantic];

                var glResource = null;
                if (primitiveDescription.compressed) {
                    glResource = this.resourceManager._getResource( accessor.id);
                } else {
                    glResource = this.resourceManager.getResource( accessor, this.vertexAttributeBufferDelegate, this.webGLContext);
                }

                    // this call will bind the resource when available
                if (glResource) {
                    gl.bindBuffer(gl.ARRAY_BUFFER, glResource);
                    var attributeLocation = program.getLocationForSymbol(symbol);
                    if (attributeLocation != null) {
                        if (attributeLocation > newMaxEnabledArray) {
                            newMaxEnabledArray = attributeLocation;
                        }

                        //Just enable what was not enabled before...
                        //FIXME: find root cause why it is needed to disable this optimization as it works well 99% of the time
                        //if (this._lastMaxEnabledArray < attributeLocation) {
                        gl.enableVertexAttribArray(attributeLocation);
                        //}

                        gl.vertexAttribPointer(attributeLocation,
                            glResource.componentsPerAttribute,
                            glResource.componentType, false, accessor.byteStride, 0);


                        if ( renderVertices && (semantic == "POSITION")) {
                            gl.drawArrays(gl.POINTS, 0, accessor.count);
                        }
                    }
                    availableCount++;
                } else {
                    this._lastMaxEnabledArray = -1;
                }
            }

            //-----
            var available = availableCount === allAttributes.length;
            if (!renderVertices)  {
                //Just disable what is not required here…
                if (available) {
                    for (var i = (newMaxEnabledArray + 1); i < this._lastMaxEnabledArray ; i++) {
                        gl.disableVertexAttribArray(i);
                    }
                }
                var glIndices = null;
                if (primitiveDescription.compressed) {
                    glIndices = this.resourceManager._getResource(primitive.indices.id);
                } else {
                    glIndices = this.resourceManager.getResource(primitive.indices, this.indicesDelegate, this.webGLContext);
                }

                if (glIndices && available) {
                    //if (!primitiveDescription.mesh.loaded) {
                    //    primitiveDescription.mesh.loadedPrimitivesCount++;
                    //}
                    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, glIndices);
                    gl.drawElements(gl.TRIANGLES, primitive.indices.count, gl.UNSIGNED_SHORT, 0);
                }
            }
            this._lastMaxEnabledArray = newMaxEnabledArray;
            return available;
        }
    },

    renderPrimitivesWithPass: {
        value: function(primitives, pass, parameters, time, pickingMode) {
            var count = primitives.length;
            var gl = this.webGLContext;
            if (pass.instanceProgram) {
                var i;
                var ctx = gl;
                var glProgram = this.resourceManager.getResource(pass.instanceProgram.program, this.programDelegate, ctx);
                if (glProgram) {
                    var states = pass.states;
                    this._restoreDefaultEnabledStatesIfAbsent(gl, states.enable);
                    this._restoreDefaultFunctionsArgsIfAbsent(gl, states.functions);

                    this.updateEnabledStates(gl, states.enable);
                    this.updateFunctionsStates(gl, states.functions);

                    this.bindedProgram = glProgram;

                    //FIXME
                    gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
                    gl.bindTexture(gl.TEXTURE_2D, null);

                    var isPickingPass = (pass.id === "__PickingPass");
                    if (isPickingPass) {
                        for (var i = 0 ; i < count ; i++) {
                            var primitive = primitives[i];
                            if (primitive.node.hidden)
                                continue;
                            if (!primitive.pickingColor) {
                                
                                if (pickingMode === "node") {
                                    var nodeID = primitive.node.baseId; //FIXME
                                    if (nodeID) {
                                        //FIXME move this into the picking technique when we have it..
                                        //for picking, we need to associate a color to each node.
                                        var nodePickingColor = pass.extras.nodeIDToColor[nodeID];
                                        if (!nodePickingColor) {
                                            nodePickingColor = vec4.createFrom(Math.random(),Math.random(),Math.random(), 1.);
                                            pass.extras.nodeIDToColor[nodeID] = nodePickingColor;
                                        }
                                        primitive.pickingColor = nodePickingColor;
                                    }
                                } else if (pickingMode === "material") {
                                    var materialID = primitive.primitive.material.baseId; //FIXME
                                    if (materialID) {
                                        var materialPickingColor = pass.extras.materialIDToColor[materialID];
                                        if (!materialPickingColor) {
                                            materialPickingColor = vec4.createFrom(Math.random(),Math.random(),Math.random(), 1.);
                                            pass.extras.materialIDToColor[materialID] = materialPickingColor;
                                        }
                                        primitive.pickingColor = materialPickingColor;
                                    }
                                }
                            }
                            this.bindedProgram.setValueForSymbol("u_pickingColor", primitive.pickingColor);
                            this.renderPrimitive(primitive, pass, time, parameters);
                        }
                    } else {
                        for (var i = 0 ; i < count ; i++) {
                            var primitive = primitives[i];
                            if (primitive.node.hidden)
                                continue;
                            var globalIntensity = 1;
                            parameters = primitive.primitive.material.parameters;
                            var transparency = parameters["transparency"];
                            if (transparency) {
                                if (transparency.value != null)
                                    globalIntensity *= transparency.value;
                            }

                            var filterColor = parameters["filterColor"];
                            if (filterColor) {
                                if (filterColor.value != null) {
                                    globalIntensity *= filterColor.value[3];
                                }
                            }
                            if (globalIntensity < 0.00001) {
                                continue;
                            }

                            this.renderPrimitive(primitive, pass, time);
                        }
                    }
                }
            }
        }
    },

    programDelegate: {
        value: {
            handleError: function(errorCode, info) {
                // FIXME: report
                console.log("ERROR:programDelegate:"+errorCode+" :"+info);
            },

            //should be called only once per program
            convert: function (source, resource, ctx) {
                var gl = ctx;
                var glslProgram = Object.create(GLSLProgram);
                glslProgram.initWithShaders( resource );
                if (!glslProgram.build(gl)) {
                    console.log(resource);
                    console.log(glslProgram.errorLogs);
                }

                return glslProgram;
            },

            resourceAvailable: function (glResource, ctx) {
            }
        }
    },

    //Create a Picking technique, to get rid of the special cases, but implemention of new design parameters
    bindRenderTarget: {
        value: function(renderTarget) {
            var gl = this.webGLContext;
            var initializing = renderTarget.FBO ? false : true;
            renderTarget.previousFBO = gl.getParameter(gl.FRAMEBUFFER_BINDING);
            if (!renderTarget.FBO) {
                renderTarget.FBO = gl.createFramebuffer();
                initializing = true;
            }

            gl.bindFramebuffer(gl.FRAMEBUFFER, renderTarget.FBO);

            var extras = renderTarget.extras;

            var shouldResize =  (gl.drawingBufferWidth != renderTarget.width) ||
                (gl.drawingBufferHeight != renderTarget.height);
            var width = gl.drawingBufferWidth;
            var height = gl.drawingBufferHeight;

            if (initializing || shouldResize) {
                renderTarget.attachments.forEach (function (attachment) {
                    if (attachment.semantic == "COLOR_ATTACHMENT0") {
                        if (extras.picking) {
                            var textureBinding = gl.getParameter(gl.TEXTURE_BINDING_2D);
                            if (initializing)
                                extras.pickingTexture = gl.createTexture();
                            if (shouldResize) {
                                gl.bindTexture(gl.TEXTURE_2D, extras.pickingTexture);
                                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
                                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
                                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
                            }
                            if (initializing)
                                gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, extras.pickingTexture, 0);
                            gl.bindTexture(gl.TEXTURE_2D, textureBinding);
                        } else {
                        }
                    }

                    if (attachment.semantic == "DEPTH_ATTACHMENT") {
                        if (extras.picking) {
                            var renderBufferBinding = gl.getParameter(gl.RENDERBUFFER_BINDING);
                            if (initializing) {
                                extras.pickingRenderBuffer = gl.createRenderbuffer();
                            }
                            if (shouldResize) {
                                gl.bindRenderbuffer(gl.RENDERBUFFER, extras.pickingRenderBuffer);
                                gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height);
                            }
                            if (initializing)
                                gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, extras.pickingRenderBuffer);

                            gl.bindRenderbuffer(gl.RENDERBUFFER, renderBufferBinding);
                        } else {
                        }
                    }

                }, this);
            }
            gl.clearColor(0,0,0,1.);
            gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT);
        }
    },

    unbindRenderTarget: {
        value: function(renderTarget) {
            var gl = this.webGLContext;

            if (renderTarget.extras.picking) {
                if (!renderTarget.extras.pickedPixel) {
                    renderTarget.extras.pickedPixel = new Uint8Array(4); //RGBA
                }
                gl.finish();

                gl.readPixels(  renderTarget.extras.coords[0],
                    renderTarget.extras.coords[1],
                    1,1,
                    gl.RGBA,gl.UNSIGNED_BYTE, renderTarget.extras.pickedPixel);
            }

            gl.bindFramebuffer(gl.FRAMEBUFFER, renderTarget.previousFBO);

            var showPickingImage = false;
            if (showPickingImage) {
                renderTarget.attachments.forEach (function (attachment) {
                    if (attachment.semantic === "COLOR_ATTACHMENT0") {
                        if (renderTarget.extras.picking) {
                            this.drawTexture(renderTarget.extras.pickingTexture);
                        }
                    }
                }, this);
            }
        }
    },

    _BBOXProgram: { value: null , writable: true },

    drawBBOX: {
        value: function(bbox, cameraMatrix, modelMatrix, projectionMatrix) {
            if (bbox == null) return;

            var gl = this.webGLContext;

            this.bindedProgram = null;

            this.setState(gl.CULL_FACE, false);

            if (!this._BBOXProgram) {
                this._BBOXProgram = Object.create(GLSLProgram);

                var vertexShader =  "precision highp float;" +
                    "attribute vec3 vert;"  +
                    "uniform mat4 u_projMatrix; " +
                    "uniform mat4 u_vMatrix; " +
                    "uniform mat4 u_mMatrix; " +
                    "void main(void) { " +
                    "gl_Position = u_projMatrix * u_vMatrix * u_mMatrix * vec4(vert,1.0); }";

                var fragmentShader =    "precision highp float;" +
                    "uniform float u_transparency; " +
                    " void main(void) { " +
                    " gl_FragColor = vec4(vec3(1.,1.,1.) , u_transparency);" +
                    "}";

                this._BBOXProgram.initWithShaders( {    "x-shader/x-vertex" : vertexShader ,
                    "x-shader/x-fragment" : fragmentShader } );
                if (!this._BBOXProgram.build(gl))
                    console.log(this._BBOXProgram.errorLogs);
            }

            var min = [bbox[0][0], bbox[0][1], bbox[0][2]];
            var max = [bbox[1][0], bbox[1][1], bbox[1][2]];

            var X = 0;
            var Y = 1;
            var Z = 2;

            if (!this._BBOXIndices) {
                var indices = [ 0, 1,
                    1, 2,
                    2, 3,
                    3, 0,
                    4, 5,
                    5, 6,
                    6, 7,
                    7, 4,
                    3, 7,
                    2, 6,
                    0, 4,
                    1, 5];

                this._BBOXIndices = gl.createBuffer();
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._BBOXIndices);
                gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
            }

            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._BBOXIndices);

            if (!this._BBOXVertexBuffer) {
                this._BBOXVertexBuffer = gl.createBuffer();
                gl.bindBuffer(gl.ARRAY_BUFFER, this._BBOXVertexBuffer);
            }
            gl.bindBuffer(gl.ARRAY_BUFFER, this._BBOXVertexBuffer);

            var vertices = [
                max[X], min[Y], min[Z],
                max[X], max[Y], min[Z],
                min[X], max[Y], min[Z],
                min[X], min[Y], min[Z],
                max[X], min[Y], max[Z],
                max[X], max[Y], max[Z],
                min[X], max[Y], max[Z],
                min[X], min[Y], max[Z]
            ];
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

            var vertLocation = this._BBOXProgram.getLocationForSymbol("vert");
            if (vertLocation != null) {
                gl.enableVertexAttribArray(vertLocation);
                gl.vertexAttribPointer(vertLocation, 3, gl.FLOAT, false, 12, 0);
            }

            this.bindedProgram = this._BBOXProgram;

            var projectionMatrixLocation = this._BBOXProgram.getLocationForSymbol("u_projMatrix");
            if (projectionMatrixLocation) {
                this._BBOXProgram.setValueForSymbol("u_projMatrix",projectionMatrix);
            }

            var mMatrixLocation = this._BBOXProgram.getLocationForSymbol("u_mMatrix");
            if (mMatrixLocation) {
                this._BBOXProgram.setValueForSymbol("u_mMatrix",modelMatrix);
            }

            var vMatrixLocation = this._BBOXProgram.getLocationForSymbol("u_vMatrix");
            if (vMatrixLocation) {
                this._BBOXProgram.setValueForSymbol("u_vMatrix",cameraMatrix);
            }

            var transparency = this._BBOXProgram.getLocationForSymbol("u_transparency");
            if (transparency) {
                this._BBOXProgram.setValueForSymbol("u_transparency",1 /*mesh.step*/);
            }

            this._BBOXProgram.commit(gl);
            //void drawElements(GLenum mode, GLsizei count, GLenum type, GLintptr offset);
            gl.drawElements(gl.LINES, 24, gl.UNSIGNED_SHORT, 0);
            gl.disableVertexAttribArray(vertLocation);

            this.setState(gl.BLEND, false);
            this.setState(gl.CULL_FACE, true);
        }
    },

    drawTexture: {
        value: function(textureName) {
            var gl = this.webGLContext;
            //save values
            var restoreDepthState = gl.isEnabled(gl.DEPTH_TEST);
            var restoreCullFace = gl.isEnabled(gl.CULL_FACE);
            var restoreBlend = gl.isEnabled(gl.BLEND);

            this.setState(gl.DEPTH_TEST, 0);
            this.setState(gl.CULL_FACE, 0);
            this.setState(gl.BLEND, 0);

            if (!this.displayTexture) {
                this.displayTexture = {};
                this.displayTexture.program = Object.create(GLSLProgram);

                var vertexShader =  "precision highp float;" +
                    "attribute vec3 vert;"  +
                    "attribute vec2 uv;"  +
                    "uniform mat4 u_projMatrix; " +
                    "varying vec2 v_uv;"  +
                    "void main(void) { " +
                    "v_uv = uv;" +
                    "gl_Position = u_projMatrix * vec4(vert,1.0); }";

                var fragmentShader =    "precision highp float;" +
                    "uniform sampler2D u_texture;" +
                    "varying vec2 v_uv;"  +
                    " void main(void) { " +
                    " vec4 color = texture2D(u_texture, v_uv); " +
                    " gl_FragColor = color; }";

                this.displayTexture.program.initWithShaders({
                    "x-shader/x-vertex" : vertexShader ,
                    "x-shader/x-fragment" : fragmentShader
                });

                if (!this.displayTexture.program.build(gl)) {
                    console.log(this.displayTexture.program.errorLogs);
                }

                var vertices = [
                    - 1.0,-1, 0.0,      0,0,
                    1.0,-1, 0.0,        1,0,
                    -1.0, 1.0, 0.0,     0,1,
                    -1.0, 1.0, 0.0,     0,1,
                    1.0,-1, 0.0,        1,0,
                    1.0, 1.0, 0.0,      1,1];

                // Init the buffer
                this.displayTexture.vertexBuffer = gl.createBuffer();
                gl.bindBuffer(gl.ARRAY_BUFFER, this.displayTexture.vertexBuffer);
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
            }
            var program = this.displayTexture.program;
            var vertexBuffer = this.displayTexture.vertexBuffer;

            gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

            var orthoMatrix = mat4.ortho(-1, 1, -1.0, 1, 0, 1000);

            var vertLocation = program.getLocationForSymbol("vert");
            var hasVertex = (typeof vertLocation !== "undefined");
            if (hasVertex) {
                gl.enableVertexAttribArray(vertLocation);
                gl.vertexAttribPointer(vertLocation, 3, gl.FLOAT, false, 20, 0);
            }
            var uvLocation = program.getLocationForSymbol("uv");
            var hasUV = (typeof uvLocation !== "undefined");
            if (hasUV) {
                gl.enableVertexAttribArray(uvLocation);
                gl.vertexAttribPointer(uvLocation, 2, gl.FLOAT, false, 20, 12);
            }

            var textureBinding = gl.getParameter(gl.TEXTURE_BINDING_2D);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, textureName);

            this.bindedProgram = program;

            var projectionMatrixLocation = program.getLocationForSymbol("u_projMatrix");
            if (projectionMatrixLocation) {
                program.setValueForSymbol("u_projMatrix",orthoMatrix);
            }

            var samplerLocation = program.getLocationForSymbol("u_texture");
            if (samplerLocation) {
                program.setValueForSymbol("u_texture", 0);
            }

            program.commit(gl);
            gl.drawArrays(gl.TRIANGLES, 0, 6);

            //restore values
            gl.bindTexture(gl.TEXTURE_2D, textureBinding);

            if (hasVertex)
                gl.disableVertexAttribArray(vertLocation);
            if (hasUV)
                gl.disableVertexAttribArray(uvLocation);

            this.setState(gl.DEPTH_TEST, restoreDepthState);
            this.setState(gl.CULL_FACE, restoreCullFace);
            this.setState(gl.BLEND, restoreBlend);
        }
    }
});
