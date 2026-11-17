/* LIVE // EARTH — Universal numerical grid-to-globe rendering skin. */
(() => {
  'use strict';
  const VERSION='1.0.0';
  const DEFAULT_PALETTE=[
    {stop:0,color:0x203b8a},{stop:.25,color:0x1689b8},{stop:.5,color:0x45b978},
    {stop:.75,color:0xf0c64b},{stop:1,color:0xc83f36}
  ];
  function validateDefinition(d,values){
    if(!d||typeof d!=='object')throw new TypeError('A grid definition is required.');
    const width=Number(d.width),height=Number(d.height);
    if(!Number.isInteger(width)||width<2||!Number.isInteger(height)||height<2)throw new RangeError('Grid width and height must be integers greater than one.');
    if(!values||typeof values.length!=='number'||values.length!==width*height)throw new RangeError(`Grid requires exactly ${width*height} values.`);
    const coordinateOrder=d.coordinateOrder||'lat-lon',rowOrder=d.rowOrder||'north-to-south',longitudeConvention=d.longitudeConvention||'-180..180';
    if(coordinateOrder!=='lat-lon')throw new TypeError('Only explicit lat-lon ordering is supported.');
    if(!['north-to-south','south-to-north'].includes(rowOrder))throw new TypeError('Invalid rowOrder.');
    if(!['-180..180','0..360'].includes(longitudeConvention))throw new TypeError('Invalid longitudeConvention.');
    const latStart=Number(d.latStart),lonStart=Number(d.lonStart),latStep=Number(d.latStep),lonStep=Number(d.lonStep);
    if(![latStart,lonStart,latStep,lonStep].every(Number.isFinite))throw new TypeError('Grid origin and spacing must be finite.');
    if(Math.abs(latStart)>90||latStep===0||lonStep===0||Math.abs(latStep)*(height-1)>180.000001||Math.abs(lonStep)*(width-1)>360.000001)throw new RangeError('Grid coordinates or spacing are outside geographic bounds.');
    if(rowOrder==='north-to-south'&&latStep>0)throw new RangeError('north-to-south grids require a negative latitude step.');
    if(rowOrder==='south-to-north'&&latStep<0)throw new RangeError('south-to-north grids require a positive latitude step.');
    return {width,height,latStart,lonStart,latStep,lonStep,rowOrder,longitudeConvention,noDataValue:d.noDataValue??null};
  }
  function normLon(lon,convention){return convention==='0..360'?((lon%360)+360)%360:((lon+180)%360+360)%360-180;}
  function position(THREE,lat,lon,r,convention){
    const a=THREE.MathUtils.degToRad(lat),b=THREE.MathUtils.degToRad(normLon(lon,convention)),c=Math.cos(a);
    // lon=0 faces +Z, +latitude points +Y; parent to Earth surface to inherit its base rotation.
    return [-r*c*Math.sin(b),r*Math.sin(a),r*c*Math.cos(b)];
  }
  function colorAt(THREE,value,min,max,palette){
    const t=max===min ? .5 : Math.max(0,Math.min(1,(value-min)/(max-min)));let lo=palette[0],hi=palette[palette.length-1];
    for(let i=0;i<palette.length-1;i++)if(t>=palette[i].stop&&t<=palette[i+1].stop){lo=palette[i];hi=palette[i+1];break;}
    const c=new THREE.Color(lo.color),other=new THREE.Color(hi.color);return c.lerp(other,(t-lo.stop)/(hi.stop-lo.stop||1));
  }
  function create(options={}){
    const T=options.THREE;
    if(!T||typeof T.BufferGeometry!=='function'||typeof T.Float32BufferAttribute!=='function'||typeof T.Mesh!=='function'||typeof T.MeshBasicMaterial!=='function'||typeof T.Color!=='function'||!T.DoubleSide)throw new TypeError('Grid skin requires the shared Three.js namespace.');
    const d=validateDefinition(options.definition,options.values),values=options.values,r=Number.isFinite(options.radius)?options.radius:1.008;
    if(r<=1)throw new RangeError('Overlay radius must be greater than the Earth surface radius.');
    const palette=Array.isArray(options.palette)&&options.palette.length>=2?options.palette:DEFAULT_PALETTE;
    let observedMin=Infinity,observedMax=-Infinity,validCount=0;for(let i=0;i<values.length;i++){const v=Number(values[i]);if(Number.isFinite(v)&&(d.noDataValue===null||v!==d.noDataValue)){observedMin=Math.min(observedMin,v);observedMax=Math.max(observedMax,v);validCount++;}}
    if(!validCount)throw new RangeError('Grid contains no valid numeric cells.');
    const min=Number.isFinite(options.min)?options.min:observedMin,max=Number.isFinite(options.max)?options.max:observedMax;
    if(max<min)throw new RangeError('Colour scale maximum must not be below minimum.');
    const positions=[],colors=[],indices=[];let cellCount=0,vertex=0;
    for(let row=0;row<d.height-1;row++)for(let col=0;col<d.width-1;col++){
      const ids=[row*d.width+col,row*d.width+col+1,(row+1)*d.width+col+1,(row+1)*d.width+col],vs=ids.map(i=>Number(values[i]));
      if(vs.some(v=>!Number.isFinite(v)||(d.noDataValue!==null&&v===d.noDataValue)))continue;
      const lat0=d.latStart+row*d.latStep,lat1=lat0+d.latStep,lon0=d.lonStart+col*d.lonStep,lon1=lon0+d.lonStep;
      const pts=[position(T,lat0,lon0,r,d.longitudeConvention),position(T,lat0,lon1,r,d.longitudeConvention),position(T,lat1,lon1,r,d.longitudeConvention),position(T,lat1,lon0,r,d.longitudeConvention)];
      const colr=colorAt(T,vs.reduce((a,b)=>a+b,0)/4,min,max,palette);
      for(const p of pts){positions.push(...p);colors.push(colr.r,colr.g,colr.b);}
      indices.push(vertex,vertex+1,vertex+2,vertex,vertex+2,vertex+3);vertex+=4;cellCount++;
    }
    if(!cellCount)throw new RangeError('No renderable cells remain after geographic and no-data checks.');
    const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();
    const material=new T.MeshBasicMaterial({vertexColors:true,transparent:options.opacity!==undefined,opacity:Number.isFinite(options.opacity)?Math.max(0,Math.min(1,options.opacity)):1,side:T.DoubleSide,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
    const mesh=new T.Mesh(geometry,material);mesh.name=options.name||'liveEarthNumericalGridLayer';mesh.userData={...(mesh.userData||{}),liveEarthGridSkin:VERSION,gridId:String(options.gridId||d.gridId||'unassigned'),signalId:String(options.signalId||'unassigned'),observedAt:options.observedAt||null,unit:options.unit||null,validCells:cellCount,gridWidth:d.width,gridHeight:d.height,colourScale:{min,max}};
    let disposed=false;return Object.freeze({mesh,stats:Object.freeze({gridId:mesh.userData.gridId,width:d.width,height:d.height,sourceCells:d.width*d.height,validCells:cellCount,renderedCells:cellCount,min,max}),dispose(){if(disposed)return;disposed=true;try{mesh.removeFromParent?.();}catch(_){}try{geometry.dispose();}catch(_){}try{material.dispose();}catch(_){}}});
  }
  window.LiveEarthGridRenderingSkin=Object.freeze({version:VERSION,create,validateDefinition});
  window.dispatchEvent?.(new CustomEvent('live-earth-grid-rendering-skin-ready',{detail:{version:VERSION}}));
})();
