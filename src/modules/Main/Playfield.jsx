import { useEffect, useRef, useLayoutEffect, useState, useContext } from "react";
import { SettingsContext } from "../../contexts/SettingsContext";
import "./Playfield.css";
import { Grids } from './Grids';
import { ActualPlayfieldBorder } from './ActualPlayfieldBorder';

export function Playfield({ beatmap }) {
	const ref = useRef(null);

	const [height, setHeight] = useState(0);

	const onResize = () => {
		setHeight(ref.current.offsetHeight);
	}

	useLayoutEffect(() => {
		onResize();
	}, []);

	useEffect(() => {
		const resizeObserver = new ResizeObserver(onResize);
		resizeObserver.observe(ref.current);
		return () => resizeObserver.disconnect();
	}, []);

	const verticalScale = useContext(SettingsContext).verticalScale;

	const maxWidth = height * 4 / (3 / verticalScale);

	return (
		<div
			className="Playfield"
			ref={ref}
			style={{
				...((height === 0) ? {} : { maxWidth: maxWidth + "px" })
			}}
		>
			<Grids />
			<ActualPlayfieldBorder />
		</div>
	)
}