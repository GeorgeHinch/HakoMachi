export function createScaleInputController({getElement}){
  function currentScaleDivisor(){
    const el=getElement('modelScale');
    const value=el ? parseFloat(el.value) : 150;
    return (Number.isFinite(value) && value>0) ? value : 150;
  }

  function modelKnownMm(){
    const value=parseFloat(getElement('knownValue').value)||0;
    const unit=getElement('knownUnit').value;
    const scale=parseFloat(getElement('modelScale').value)||150;
    if(unit==='mm'||unit==='model_mm') return value;
    if(unit==='in'||unit==='model_in') return value*25.4;
    if(unit==='source_mm'||unit==='real_mm') return value/scale;
    if(unit==='source_m'||unit==='real_m') return value*1000/scale;
    if(unit==='source_ft'||unit==='real_ft') return value*304.8/scale;
    return value;
  }

  return {
    currentScaleDivisor,
    modelKnownMm,
  };
}
