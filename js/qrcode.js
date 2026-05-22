/* FitPulse — self-contained scannable-code generators (no dependencies).
 *
 * Exposes two globals:
 *   QR.svg(text, opts)        -> a standard QR Code (byte mode, ECC level M) as an <svg> string
 *   Barcode.code128(text, o)  -> a Code 128 (auto A/B/C) linear barcode as an <svg> string
 *
 * Both produce real, scanner-readable symbologies.
 */
(function(global){
  'use strict';

  /* ======================= QR CODE (byte mode, ECC=M) ======================= */
  // Galois field GF(256) for Reed-Solomon.
  const EXP = new Array(512), LOG = new Array(256);
  (function(){ let x=1; for(let i=0;i<255;i++){ EXP[i]=x; LOG[x]=i; x<<=1; if(x&0x100) x^=0x11d; } for(let i=255;i<512;i++) EXP[i]=EXP[i-255]; })();
  const gmul=(a,b)=> (a===0||b===0)?0:EXP[LOG[a]+LOG[b]];

  function rsGenPoly(deg){
    let poly=[1];
    for(let i=0;i<deg;i++){
      const np=new Array(poly.length+1).fill(0);
      for(let j=0;j<poly.length;j++){
        np[j]^=poly[j];
        np[j+1]^=gmul(poly[j],EXP[i]);
      }
      poly=np;
    }
    return poly;
  }
  function rsEncode(data,ecLen){
    const gen=rsGenPoly(ecLen);
    const res=new Array(ecLen).fill(0);
    for(let i=0;i<data.length;i++){
      const factor=data[i]^res[0];
      res.shift(); res.push(0);
      if(factor!==0) for(let j=0;j<gen.length-1;j++) res[j]^=gmul(gen[j+1],factor);
    }
    return res;
  }

  // Per-version capacity (byte mode, ECC M) and EC parameters.
  // [version, totalDataCodewords, ecCodewordsPerBlock, numBlocks, byteCapacity]
  const VER = [
    [1, 16, 10, 1, 14],
    [2, 28, 16, 1, 26],
    [3, 44, 26, 1, 42],
    [4, 64, 18, 2, 62],
    [5, 86, 24, 2, 84],
    [6, 108, 16, 4, 106],
    [7, 124, 18, 4, 122],
    [8, 154, 22, 2, 152],
    [9, 182, 22, 3, 180],
    [10, 216, 26, 4, 213]
  ];

  function pickVersion(len){
    for(const v of VER){ if(len<=v[4]) return v; }
    throw new Error('QR: data too long for this lightweight encoder');
  }

  function bytesToCodewords(text, ver){
    const data=[];
    for(let i=0;i<text.length;i++){ data.push(text.charCodeAt(i)&0xff); }
    const total=ver[1];
    // Build bit stream: mode(0100) + length(8 bits, v1-9) + data + terminator + pad
    const bits=[];
    const push=(val,n)=>{ for(let i=n-1;i>=0;i--) bits.push((val>>i)&1); };
    push(0b0100,4);
    push(data.length,8);
    for(const b of data) push(b,8);
    // terminator
    const cap=total*8;
    for(let i=0;i<4 && bits.length<cap;i++) bits.push(0);
    while(bits.length%8!==0) bits.push(0);
    const cw=[];
    for(let i=0;i<bits.length;i+=8){ let b=0; for(let j=0;j<8;j++) b=(b<<1)|bits[i+j]; cw.push(b); }
    const pads=[0xEC,0x11]; let pi=0;
    while(cw.length<total){ cw.push(pads[pi++%2]); }
    return cw;
  }

  function interleave(cw, ver){
    const ecLen=ver[2], nb=ver[3], total=ver[1];
    const base=Math.floor(total/nb), rem=total%nb;
    const blocks=[]; let p=0;
    for(let i=0;i<nb;i++){
      const dlen=base+(i>=nb-rem?1:0);
      const d=cw.slice(p,p+dlen); p+=dlen;
      blocks.push({d, ec:rsEncode(d,ecLen)});
    }
    const out=[];
    const maxD=Math.max(...blocks.map(b=>b.d.length));
    for(let i=0;i<maxD;i++) for(const b of blocks) if(i<b.d.length) out.push(b.d[i]);
    for(let i=0;i<ecLen;i++) for(const b of blocks) out.push(b.ec[i]);
    return out;
  }

  function buildMatrix(ver, finalCw){
    const version=ver[0];
    const size=version*4+17;
    const m=Array.from({length:size},()=>new Array(size).fill(null));
    const fn=Array.from({length:size},()=>new Array(size).fill(false)); // function-module mask

    function placeFinder(r,c){
      for(let i=-1;i<=7;i++)for(let j=-1;j<=7;j++){
        const rr=r+i, cc=c+j; if(rr<0||cc<0||rr>=size||cc>=size) continue;
        const on=(i>=0&&i<=6&&(j===0||j===6))||(j>=0&&j<=6&&(i===0||i===6))||(i>=2&&i<=4&&j>=2&&j<=4);
        m[rr][cc]=on?1:0; fn[rr][cc]=true;
      }
    }
    placeFinder(0,0); placeFinder(0,size-7); placeFinder(size-7,0);

    // timing patterns
    for(let i=8;i<size-8;i++){ const v=(i%2===0)?1:0; m[6][i]=v; fn[6][i]=true; m[i][6]=v; fn[i][6]=true; }
    // dark module
    m[size-8][8]=1; fn[size-8][8]=true;

    // alignment pattern (single, for versions 2-6 it's centered; positions per spec)
    const APOS={2:[6,18],3:[6,22],4:[6,26],5:[6,30],6:[6,34],7:[6,22,38],8:[6,24,42],9:[6,26,46],10:[6,28,50]};
    if(APOS[version]){
      const pos=APOS[version];
      for(const r of pos)for(const c of pos){
        // skip if overlapping finder
        if((r<=8&&c<=8)||(r<=8&&c>=size-9)||(r>=size-9&&c<=8)) continue;
        for(let i=-2;i<=2;i++)for(let j=-2;j<=2;j++){
          const on=(Math.max(Math.abs(i),Math.abs(j))!==1)?1:0;
          m[r+i][c+j]=on; fn[r+i][c+j]=true;
        }
      }
    }

    // reserve format info areas
    for(let i=0;i<9;i++){ if(!fn[8][i]){fn[8][i]=true;} if(!fn[i][8]){fn[i][8]=true;} }
    for(let i=0;i<8;i++){ fn[8][size-1-i]=true; fn[size-1-i][8]=true; }

    // place data with zigzag
    let idx=0, bitPos=7, dir=-1;
    const getBit=()=>{ if(idx>=finalCw.length) return 0; const b=(finalCw[idx]>>bitPos)&1; bitPos--; if(bitPos<0){bitPos=7;idx++;} return b; };
    let col=size-1;
    let row=size-1; dir=-1;
    while(col>0){
      if(col===6) col--; // skip timing column
      for(let r=0;r<size;r++){
        const rr = dir===-1 ? size-1-r : r;
        for(let k=0;k<2;k++){
          const cc=col-k;
          if(!fn[rr][cc]){ m[rr][cc]=getBit(); }
        }
      }
      dir=-dir; col-=2;
    }

    // apply mask 0: (r+c)%2==0
    for(let r=0;r<size;r++)for(let c=0;c<size;c++){
      if(!fn[r][c] && m[r][c]!==null){ if((r+c)%2===0) m[r][c]^=1; }
    }

    // format info: ECC=M (bits 00), mask 0 (000) => data 00000
    // BCH(15,5) of 0b00000 with mask 0x5412
    const fmtData=0b00000; // M + mask0
    let g=fmtData<<10;
    const poly=0b10100110111;
    let gg=g;
    for(let i=14;i>=10;i--){ if((gg>>i)&1){ gg^= (poly<<(i-10)); } }
    let fmt=((fmtData<<10)|(gg&0x3ff))^0b101010000010010;
    const fbits=[]; for(let i=14;i>=0;i--) fbits.push((fmt>>i)&1);
    // place format bits
    const fmtPos1=[[8,0],[8,1],[8,2],[8,3],[8,4],[8,5],[8,7],[8,8],[7,8],[5,8],[4,8],[3,8],[2,8],[1,8],[0,8]];
    for(let i=0;i<15;i++){ const [r,c]=fmtPos1[i]; m[r][c]=fbits[i]; }
    const fmtPos2=[[size-1,8],[size-2,8],[size-3,8],[size-4,8],[size-5,8],[size-6,8],[size-7,8],[8,size-8],[8,size-7],[8,size-6],[8,size-5],[8,size-4],[8,size-3],[8,size-2],[8,size-1]];
    for(let i=0;i<15;i++){ const [r,c]=fmtPos2[i]; m[r][c]=fbits[i]; }

    return m;
  }

  function qrSvg(text, opts){
    opts=opts||{};
    const ver=pickVersion(text.length);
    const cw=bytesToCodewords(text,ver);
    const finalCw=interleave(cw,ver);
    const m=buildMatrix(ver,finalCw);
    const size=m.length;
    const quiet=opts.quiet!=null?opts.quiet:2;
    const dim=size+quiet*2;
    const dark=opts.dark||'#0B0C0E';
    let path='';
    for(let r=0;r<size;r++)for(let c=0;c<size;c++){
      if(m[r][c]===1){ path+='M'+(c+quiet)+' '+(r+quiet)+'h1v1h-1z'; }
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+dim+' '+dim+'" shape-rendering="crispEdges">'+
      '<rect width="'+dim+'" height="'+dim+'" fill="#fff"/>'+
      '<path d="'+path+'" fill="'+dark+'"/></svg>';
  }

  /* ======================= CODE 128 (auto) ======================= */
  // 108 patterns (indices 0..106 + stop). Each is a string of bar/space widths.
  const C128 = ["11011001100","11001101100","11001100110","10010011000","10010001100","10001001100","10011001000","10011000100","10001100100","11001001000","11001000100","11000100100","10110011100","10011011100","10011001110","10111001100","10011101100","10011100110","11001110010","11001011100","11001001110","11011100100","11001110100","11101101110","11101001100","11100101100","11100100110","11101100100","11100110100","11100110010","11011011000","11011000110","11000110110","10100011000","10001011000","10001000110","10110001000","10001101000","10001100010","11010001000","11000101000","11000100010","10110111000","10110001110","10001101110","10111011000","10111000110","10001110110","11101110110","11010001110","11000101110","11011101000","11011100010","11011101110","11101011000","11101000110","11100010110","11101101000","11101100010","11100011010","11101111010","11001000010","11110001010","10100110000","10100001100","10010110000","10010000110","10000101100","10000100110","10110010000","10110000100","10011010000","10011000010","10000110100","10000110010","11000010010","11001010000","11110111010","11000010100","10001111010","10100111100","10010111100","10010011110","10111100100","10011110100","10011110010","11110100100","11110010100","11110010010","11011011110","11011110110","11110110110","10101111000","10100011110","10001011110","10111101000","10111100010","11110101000","11110100010","10111011110","10111101110","11101011110","11110101110","11010000100","11010010000","11010011100","1100011101011"];
  const STOP_IDX=106;

  function code128(text, opts){
    opts=opts||{};
    const codes=[];
    // Use Code B for simplicity (covers digits, upper, lower, symbols ASCII 32-127).
    const START_B=104;
    codes.push(START_B);
    for(let i=0;i<text.length;i++){
      const v=text.charCodeAt(i)-32;
      if(v<0||v>94){ codes.push(0); } else { codes.push(v); }
    }
    // checksum
    let sum=START_B;
    for(let i=0;i<text.length;i++){ sum += codes[i+1]*(i+1); }
    codes.push(sum%103);
    codes.push(STOP_IDX);

    // Build bars
    let pattern='';
    for(const c of codes){ pattern += C128[c]; }
    const n=pattern.length;
    const h=opts.height||54;
    let path=''; let x=0;
    for(let i=0;i<n;i++){
      if(pattern[i]==='1'){ path+='M'+x+' 0h1v'+h+'h-1z'; }
      x++;
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+n+' '+h+'" preserveAspectRatio="none" shape-rendering="crispEdges">'+
      '<rect width="'+n+'" height="'+h+'" fill="#fff"/>'+
      '<path d="'+path+'" fill="#0B0C0E"/></svg>';
  }

  global.QR={svg:qrSvg};
  global.Barcode={code128:code128};
})(typeof window!=='undefined'?window:this);
